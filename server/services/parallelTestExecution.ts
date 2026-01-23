/**
 * Parallel Test Execution Service
 * Runs multiple test sets concurrently (7PS = 7 Parallel Sets)
 */
import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/database.js';
import type { PlaywrightRunResult } from './testExecutionQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Maximum concurrent test executions
const MAX_CONCURRENT = 7;

// Batch execution item
interface BatchItem {
  testRunId: number;
  testSetId: number;
  testSetName: string;
  releaseId: number;
  releaseNumber?: string;
  baseUrl: string;
}

// Batch execution status
export interface BatchExecutionStatus {
  batchId: string;
  status: 'running' | 'completed' | 'failed';
  totalSets: number;
  completedSets: number;
  passedSets: number;
  failedSets: number;
  startedAt: Date;
  completedAt: Date | null;
  testRuns: {
    testRunId: number;
    testSetName: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
  }[];
}

// Running process info
interface RunningProcess {
  testRunId: number;
  testSetId: number;
  process: ChildProcess;
  startedAt: Date;
}

class ParallelTestExecution extends EventEmitter {
  private batches = new Map<string, BatchExecutionStatus>();
  private runningProcesses = new Map<number, RunningProcess>();

  constructor() {
    super();
    this.on('error', (err: { batchId: string; error: string }) => {
      console.error(`[7PS] Batch ${err.batchId} error: ${err.error}`);
    });
  }

  /**
   * Generate a unique batch ID
   */
  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Start a batch execution of multiple test sets
   * @param items - Test set items to execute
   * @param _executedBy - User who triggered the execution
   * @param providedBatchId - Optional pre-generated batch ID (used when batch_id is stored in DB)
   */
  async startBatch(
    items: BatchItem[],
    _executedBy: string | null,
    providedBatchId?: string
  ): Promise<{ batchId: string; testRunIds: number[] }> {
    const batchId = providedBatchId || this.generateBatchId();
    const testRunIds: number[] = [];

    console.log(`[7PS] Starting batch ${batchId} with ${items.length} test sets`);

    // Initialize batch status
    const batchStatus: BatchExecutionStatus = {
      batchId,
      status: 'running',
      totalSets: items.length,
      completedSets: 0,
      passedSets: 0,
      failedSets: 0,
      startedAt: new Date(),
      completedAt: null,
      testRuns: items.map((item) => ({
        testRunId: item.testRunId,
        testSetName: item.testSetName,
        status: 'pending',
      })),
    };

    this.batches.set(batchId, batchStatus);

    // Process items with concurrency limit
    const queue = [...items];
    const executing: Promise<void>[] = [];

    const executeNext = async (): Promise<void> => {
      if (queue.length === 0) return;

      const item = queue.shift();
      if (!item) return;

      testRunIds.push(item.testRunId);

      // Update status to running
      const runStatus = batchStatus.testRuns.find((r) => r.testRunId === item.testRunId);
      if (runStatus) runStatus.status = 'running';

      try {
        const result = await this.executeTestSet(item, batchId);

        // Update status based on result
        if (runStatus) {
          runStatus.status = result.status;
        }

        if (result.status === 'passed') {
          batchStatus.passedSets++;
        } else {
          batchStatus.failedSets++;
        }

        this.saveResults(result);
      } catch (err) {
        const error = err as Error;
        console.error(`[7PS] Test set ${item.testSetId} failed:`, error.message);

        if (runStatus) runStatus.status = 'failed';
        batchStatus.failedSets++;

        this.markFailed(item.testRunId, error.message);
      } finally {
        batchStatus.completedSets++;
        this.runningProcesses.delete(item.testRunId);
        this.emit('progress', batchStatus);
      }
    };

    // Start initial batch of concurrent executions
    for (let i = 0; i < Math.min(MAX_CONCURRENT, items.length); i++) {
      const promise = executeNext().then(() => {
        // When one completes, start another if queue has items
        const startNext = async (): Promise<void> => {
          if (queue.length > 0) {
            await executeNext();
            await startNext();
          }
        };
        return startNext();
      });
      executing.push(promise);
    }

    // Wait for all to complete (in background)
    Promise.all(executing)
      .then(() => {
        batchStatus.status = batchStatus.failedSets > 0 ? 'failed' : 'completed';
        batchStatus.completedAt = new Date();
        this.emit('complete', batchStatus);
        console.log(
          `[7PS] Batch ${batchId} completed: ${batchStatus.passedSets} passed, ${batchStatus.failedSets} failed`
        );
      })
      .catch((err) => {
        batchStatus.status = 'failed';
        batchStatus.completedAt = new Date();
        this.emit('error', { batchId, error: (err as Error).message });
      });

    return { batchId, testRunIds };
  }

  /**
   * Execute a single test set
   */
  private executeTestSet(item: BatchItem, _batchId: string): Promise<PlaywrightRunResult> {
    return new Promise((resolve, reject) => {
      const projectRoot = path.resolve(__dirname, '../..');
      const runnerPath = path.join(projectRoot, 'tests/runner.ts');

      const serverPort = process.env.PORT || 3000;
      const env = {
        ...process.env,
        TEST_RUN_ID: String(item.testRunId),
        TEST_SET_ID: String(item.testSetId),
        RELEASE_ID: String(item.releaseId),
        RELEASE_NUMBER: item.releaseNumber || '',
        TEST_BASE_URL: item.baseUrl,
        API_BASE_URL: `http://localhost:${serverPort}`,
        PLAYWRIGHT_WORKERS: '1', // Each test set runs with 1 worker
      };

      console.log(`[7PS] Starting test set ${item.testSetId} (run ${item.testRunId})`);

      const child = spawn('npx', ['tsx', runnerPath], {
        cwd: projectRoot,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.runningProcesses.set(item.testRunId, {
        testRunId: item.testRunId,
        testSetId: item.testSetId,
        process: child,
        startedAt: new Date(),
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const resultMatch = stdout.match(/RESULT:(.+)$/m);

        if (resultMatch) {
          try {
            const result = JSON.parse(resultMatch[1]) as PlaywrightRunResult;
            resolve(result);
            return;
          } catch (parseErr) {
            console.error(`[7PS] Failed to parse RESULT JSON: ${parseErr}`);
          }
        }

        if (code === 0) {
          resolve({
            testRunId: item.testRunId,
            status: 'passed',
            durationMs: 0,
            totalScenarios: 0,
            totalSteps: 0,
            passedSteps: 0,
            failedSteps: 0,
            steps: [],
          });
        } else {
          const errorDetails = stderr || stdout.slice(-2000) || 'No output captured';
          reject(new Error(`Playwright process exited with code ${code}: ${errorDetails}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to start Playwright: ${err.message}`));
      });
    });
  }

  /**
   * Get batch status
   */
  getBatchStatus(batchId: string): BatchExecutionStatus | null {
    return this.batches.get(batchId) || null;
  }

  /**
   * Get all active batches
   */
  getActiveBatches(): BatchExecutionStatus[] {
    return Array.from(this.batches.values()).filter((b) => b.status === 'running');
  }

  /**
   * Save test results to database
   */
  private saveResults(result: PlaywrightRunResult): void {
    try {
      const db = getDb();

      db.transaction(() => {
        db.prepare(
          `
          UPDATE test_runs SET
            status = ?,
            duration_ms = ?,
            total_scenarios = ?,
            total_steps = ?,
            passed_steps = ?,
            failed_steps = ?,
            video_path = ?
          WHERE id = ?
        `
        ).run(
          result.status,
          result.durationMs,
          result.totalScenarios,
          result.totalSteps,
          result.passedSteps,
          result.failedSteps,
          result.videoPath || null,
          result.testRunId
        );

        const insertStep = db.prepare(`
          INSERT INTO test_run_steps (
            test_run_id, test_step_id, scenario_id, scenario_name,
            case_name, step_definition, expected_results, status, error_message, duration_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const step of result.steps) {
          insertStep.run(
            result.testRunId,
            step.testStepId,
            step.scenarioId,
            step.scenarioName,
            step.caseName,
            step.stepDefinition,
            step.expectedResults || null,
            step.status,
            step.errorMessage || null,
            step.durationMs
          );
        }
      })();

      console.log(`[7PS] Saved results for test run ${result.testRunId}`);
    } catch (err) {
      console.error(`[7PS] Failed to save results for test run ${result.testRunId}:`, err);
    }
  }

  /**
   * Mark a test run as failed
   */
  private markFailed(testRunId: number, errorMessage: string): void {
    try {
      const db = getDb();
      db.prepare(
        `
        UPDATE test_runs SET
          status = 'failed',
          failed_details = ?
        WHERE id = ?
      `
      ).run(JSON.stringify([{ error: errorMessage }]), testRunId);
    } catch (err) {
      console.error(`[7PS] Failed to mark test run ${testRunId} as failed:`, err);
    }
  }
}

// Export singleton instance
export const parallelTestExecution = new ParallelTestExecution();
