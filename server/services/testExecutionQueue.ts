/**
 * Test Execution Queue Service
 * Manages Playwright test execution with queue support (one at a time)
 */
import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/database.js';
import type { TestRunStepRow } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Execution item in the queue
interface QueueItem {
  testRunId: number;
  testSetId: number;
  releaseId: number;
  releaseNumber?: string;
  baseUrl: string;
  addedAt: Date;
}

// Progress update from Playwright runner
export interface ProgressUpdate {
  currentScenario: number;
  totalScenarios: number;
  scenarioName: string;
  caseName: string;
  currentStep: number;
  totalSteps: number;
  stepDefinition: string;
}

// Currently running execution
interface CurrentExecution {
  testRunId: number;
  testSetId: number;
  process: ChildProcess | null;
  startedAt: Date;
  progress: ProgressUpdate | null;
}

// Step result from Playwright runner
export interface PlaywrightStepResult {
  testStepId: number;
  scenarioId: number;
  scenarioName: string;
  caseName: string;
  stepDefinition: string;
  expectedResults: string | null;
  status: 'passed' | 'failed' | 'skipped';
  errorMessage?: string;
  durationMs: number;
}

// Full test run result from Playwright
export interface PlaywrightRunResult {
  testRunId: number;
  status: 'passed' | 'failed';
  durationMs: number;
  totalScenarios: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  steps: PlaywrightStepResult[];
  videoPath?: string;
}

class TestExecutionQueue extends EventEmitter {
  private current: CurrentExecution | null = null;
  private pending: QueueItem[] = [];

  constructor() {
    super();
    // Register default error handler to prevent unhandled error crashes
    // External code can still listen to 'error' events for custom handling
    this.on('error', (errorInfo: { testRunId: number; error: string }) => {
      console.error(`[Queue] Error event for test run ${errorInfo.testRunId}: ${errorInfo.error}`);
    });
  }

  /**
   * Add a test run to the execution queue
   */
  enqueue(item: Omit<QueueItem, 'addedAt'>): void {
    this.pending.push({
      ...item,
      addedAt: new Date(),
    });
    console.log(
      `[Queue] Added test run ${item.testRunId} to queue. Queue size: ${this.pending.length}`
    );

    // Start processing if not already running
    if (!this.current) {
      this.processNext();
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): {
    current: { testRunId: number; startedAt: Date } | null;
    pending: { testRunId: number; addedAt: Date }[];
  } {
    return {
      current: this.current
        ? { testRunId: this.current.testRunId, startedAt: this.current.startedAt }
        : null,
      pending: this.pending.map((p) => ({
        testRunId: p.testRunId,
        addedAt: p.addedAt,
      })),
    };
  }

  /**
   * Check if a specific test run is in progress or queued
   */
  isRunning(testRunId: number): boolean {
    if (this.current?.testRunId === testRunId) return true;
    return this.pending.some((p) => p.testRunId === testRunId);
  }

  /**
   * Get progress for a specific test run
   */
  getProgress(testRunId: number): ProgressUpdate | null {
    if (this.current?.testRunId === testRunId) {
      return this.current.progress;
    }
    return null;
  }

  /**
   * Process the next item in the queue
   */
  private processNext(): void {
    if (this.current || this.pending.length === 0) {
      return;
    }

    const item = this.pending.shift();
    if (!item) {
      return;
    }
    this.current = {
      testRunId: item.testRunId,
      testSetId: item.testSetId,
      process: null,
      startedAt: new Date(),
      progress: null,
    };

    console.log(`[Queue] Starting test run ${item.testRunId}`);
    this.emit('start', { testRunId: item.testRunId });

    this.executePlaywright(item)
      .then((result) => {
        console.log(`[Queue] Completed test run ${item.testRunId}: ${result.status}`);
        this.emit('complete', result);
        this.saveResults(result);
      })
      .catch((err) => {
        console.error(`[Queue] Failed test run ${item.testRunId}:`, err);
        this.emit('error', { testRunId: item.testRunId, error: err.message });
        this.markFailed(item.testRunId, err.message);
      })
      .finally(() => {
        this.current = null;
        // Process next item in queue
        setTimeout(() => this.processNext(), 100);
      });
  }

  /**
   * Execute Playwright tests for a test run
   */
  private executePlaywright(item: QueueItem): Promise<PlaywrightRunResult> {
    return new Promise((resolve, reject) => {
      const projectRoot = path.resolve(__dirname, '../..');
      const runnerPath = path.join(projectRoot, 'tests/runner.ts');

      // Environment variables for the test runner
      const serverPort = process.env.PORT || 3000;
      const env = {
        ...process.env,
        TEST_RUN_ID: String(item.testRunId),
        TEST_SET_ID: String(item.testSetId),
        RELEASE_ID: String(item.releaseId),
        RELEASE_NUMBER: item.releaseNumber || '',
        TEST_BASE_URL: item.baseUrl,
        API_BASE_URL: `http://localhost:${serverPort}`,
      };

      // Spawn tsx to run the TypeScript runner
      const child = spawn('npx', ['tsx', runnerPath], {
        cwd: projectRoot,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (this.current) {
        this.current.process = child;
      }

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        // Emit progress events for real-time updates
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('PROGRESS:')) {
            try {
              const progress = JSON.parse(line.substring(9)) as ProgressUpdate;
              // Store progress in current execution
              if (this.current && this.current.testRunId === item.testRunId) {
                this.current.progress = progress;
              }
              this.emit('progress', { testRunId: item.testRunId, ...progress });
            } catch {
              // Ignore parse errors
            }
          }
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        console.error(`[Playwright stderr] ${data.toString()}`);
      });

      child.on('close', (code) => {
        // Always try to parse RESULT from stdout first (test failures exit with code 1 but still have results)
        const resultMatch = stdout.match(/RESULT:(.+)$/m);

        if (resultMatch) {
          try {
            const result = JSON.parse(resultMatch[1]) as PlaywrightRunResult;
            resolve(result);
            return;
          } catch (parseErr) {
            // Continue to error handling if parse fails
            console.error(`[Queue] Failed to parse RESULT JSON: ${parseErr}`);
          }
        }

        // No valid RESULT found - handle as error
        if (code === 0) {
          // Process succeeded but no RESULT - create minimal success result
          resolve({
            testRunId: item.testRunId,
            status: 'passed',
            durationMs: Date.now() - item.addedAt.getTime(),
            totalScenarios: 0,
            totalSteps: 0,
            passedSteps: 0,
            failedSteps: 0,
            steps: [],
          });
        } else {
          // Process failed without RESULT - capture all output for debugging
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
   * Save test results to database
   */
  private async saveResults(result: PlaywrightRunResult): Promise<void> {
    try {
      const db = getDb();

      await db.exec('BEGIN TRANSACTION');

      try {
        // Update test_runs table
        await db.run(
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
        `,
          [
            result.status,
            result.durationMs,
            result.totalScenarios,
            result.totalSteps,
            result.passedSteps,
            result.failedSteps,
            result.videoPath || null,
            result.testRunId,
          ]
        );

        // Insert step results
        for (const step of result.steps) {
          await db.run(
            `
            INSERT INTO test_run_steps (
              test_run_id, test_step_id, scenario_id, scenario_name,
              case_name, step_definition, expected_results, status, error_message, duration_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              result.testRunId,
              step.testStepId,
              step.scenarioId,
              step.scenarioName,
              step.caseName,
              step.stepDefinition,
              step.expectedResults || null,
              step.status,
              step.errorMessage || null,
              step.durationMs,
            ]
          );
        }

        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }

      console.log(`[Queue] Saved results for test run ${result.testRunId}`);
    } catch (err) {
      console.error(`[Queue] Failed to save results for test run ${result.testRunId}:`, err);
    }
  }

  /**
   * Mark a test run as failed
   */
  private async markFailed(testRunId: number, errorMessage: string): Promise<void> {
    try {
      const db = getDb();
      await db.run(
        `
        UPDATE test_runs SET
          status = 'failed',
          failed_details = ?
        WHERE id = ?
      `,
        [JSON.stringify([{ error: errorMessage }]), testRunId]
      );
    } catch (err) {
      console.error(`[Queue] Failed to mark test run ${testRunId} as failed:`, err);
    }
  }
}

// Export singleton instance
export const testExecutionQueue = new TestExecutionQueue();

/**
 * Get step results for a test run
 */
export async function getTestRunSteps(testRunId: number): Promise<TestRunStepRow[]> {
  const db = getDb();
  return await db.all<TestRunStepRow>(
    `
      SELECT * FROM test_run_steps
      WHERE test_run_id = ?
      ORDER BY id ASC
    `,
    [testRunId]
  );
}
