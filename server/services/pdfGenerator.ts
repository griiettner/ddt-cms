/**
 * PDF Report Generator Service
 * Generates PDF reports for test runs using Playwright
 */
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '../db/database.js';
import type { TestRunRow, TestRunStepRow } from '../types/index.js';

// Report directories
const REPORTS_DIR = path.join(process.cwd(), 'tests', 'reports', 'results');

interface PdfGenerationResult {
  success: boolean;
  pdfPath?: string;
  error?: string;
}

/**
 * Get the run directory for a test run
 */
function getRunDir(testRunId: number): string {
  return path.join(REPORTS_DIR, `run-${testRunId}`);
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

/**
 * Format date to readable string
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Generate HTML content for the report
 */
function generateHtmlReport(
  run: TestRunRow,
  steps: TestRunStepRow[],
  releaseNumber?: string
): string {
  // Group steps by case and scenario
  const caseMap = new Map<string, Map<string, TestRunStepRow[]>>();

  for (const step of steps) {
    const caseName = step.case_name || 'Unknown Case';
    const scenarioName = step.scenario_name || 'Unknown Scenario';

    if (!caseMap.has(caseName)) {
      caseMap.set(caseName, new Map());
    }
    const scenarioMap = caseMap.get(caseName);
    if (!scenarioMap) continue;
    if (!scenarioMap.has(scenarioName)) {
      scenarioMap.set(scenarioName, []);
    }
    const scenarioSteps = scenarioMap.get(scenarioName);
    if (scenarioSteps) {
      scenarioSteps.push(step);
    }
  }

  // Build HTML for cases
  let casesHtml = '';
  for (const [caseName, scenarios] of caseMap) {
    let scenariosHtml = '';
    for (const [scenarioName, scenarioSteps] of scenarios) {
      let stepsHtml = '';
      for (const step of scenarioSteps) {
        const statusColor =
          step.status === 'passed' ? '#16a34a' : step.status === 'failed' ? '#dc2626' : '#ca8a04';
        const statusBg =
          step.status === 'passed' ? '#dcfce7' : step.status === 'failed' ? '#fee2e2' : '#fef9c3';
        const statusIcon = step.status === 'passed' ? '✓' : step.status === 'failed' ? '✗' : '⚠';

        stepsHtml += `
          <div style="background: ${statusBg}; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <span style="color: ${statusColor}; font-size: 18px; font-weight: bold;">${statusIcon}</span>
              <div style="flex: 1;">
                <div style="color: ${statusColor}; font-weight: 500; margin-bottom: 4px;">
                  ${step.step_definition || 'Step'}
                </div>
                ${step.expected_results ? `<div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Expected: ${step.expected_results}</div>` : ''}
                <div style="color: #9ca3af; font-size: 11px;">Duration: ${formatDuration(step.duration_ms)}</div>
                ${step.error_message ? `<div style="color: #dc2626; font-size: 12px; margin-top: 8px; padding: 8px; background: #fef2f2; border-radius: 4px;">${step.error_message}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }

      scenariosHtml += `
        <div style="padding: 16px;">
          <h4 style="color: #374151; font-size: 14px; font-weight: 500; margin-bottom: 12px;">${scenarioName}</h4>
          ${stepsHtml}
        </div>
      `;
    }

    casesHtml += `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
        <div style="background: #dbeafe; padding: 12px 16px;">
          <h3 style="color: #1d4ed8; font-weight: 600; margin: 0;">${caseName}</h3>
        </div>
        <div style="border-top: 1px solid #e5e7eb;">
          ${scenariosHtml}
        </div>
      </div>
    `;
  }

  // Status badge color
  const statusColor =
    run.status === 'passed' ? '#16a34a' : run.status === 'failed' ? '#dc2626' : '#ca8a04';
  const statusBg =
    run.status === 'passed' ? '#dcfce7' : run.status === 'failed' ? '#fee2e2' : '#fef9c3';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Test Run Report #${run.id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; padding: 40px; background: #fff; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        h2 { font-size: 18px; margin: 24px 0 12px; color: #111827; }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h1 style="color: #1d4ed8;">Test Run Report</h1>
              <p style="color: #6b7280; font-size: 14px;">${run.test_set_name || `Test Set #${run.test_set_id}`}</p>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; background: ${statusBg}; color: ${statusColor}; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 14px;">
                ${run.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; font-size: 14px;">
            <div>
              <span style="color: #6b7280;">Run ID:</span>
              <span style="font-weight: 500; margin-left: 4px;">#${run.id}</span>
            </div>
            <div>
              <span style="color: #6b7280;">Release:</span>
              <span style="font-weight: 500; margin-left: 4px;">${releaseNumber || run.release_id}</span>
            </div>
            <div>
              <span style="color: #6b7280;">Environment:</span>
              <span style="font-weight: 500; margin-left: 4px; text-transform: uppercase;">${run.environment || '-'}</span>
            </div>
            <div>
              <span style="color: #6b7280;">Duration:</span>
              <span style="font-weight: 500; margin-left: 4px;">${formatDuration(run.duration_ms)}</span>
            </div>
            <div>
              <span style="color: #6b7280;">Executed:</span>
              <span style="margin-left: 4px;">${formatDate(run.executed_at)}</span>
            </div>
            <div>
              <span style="color: #6b7280;">Run By:</span>
              <span style="margin-left: 4px;">${run.executed_by || 'System'}</span>
            </div>
            <div>
              <span style="color: #16a34a;">Passed:</span>
              <span style="font-weight: 600; color: #16a34a; margin-left: 4px;">${run.passed_steps || 0}</span>
            </div>
            <div>
              <span style="color: #dc2626;">Failed:</span>
              <span style="font-weight: 600; color: #dc2626; margin-left: 4px;">${run.failed_steps || 0}</span>
            </div>
          </div>
          ${run.base_url ? `<div style="margin-top: 12px; font-size: 12px;"><span style="color: #6b7280;">Base URL:</span> <span style="font-family: monospace;">${run.base_url}</span></div>` : ''}
        </div>

        <!-- Step Results -->
        <h2>Step Results</h2>
        ${casesHtml || '<p style="color: #6b7280; padding: 24px; text-align: center;">No step results available.</p>'}

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          Generated by UAT DDT CMS on ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate PDF report for a test run
 */
export async function generatePdfReport(testRunId: number): Promise<PdfGenerationResult> {
  try {
    const db = getDb();

    // Get test run data
    const run = await db.get<TestRunRow>('SELECT * FROM test_runs WHERE id = ?', [testRunId]);
    if (!run) {
      return { success: false, error: 'Test run not found' };
    }

    // Get step results
    const steps = await db.all<TestRunStepRow>(
      'SELECT * FROM test_run_steps WHERE test_run_id = ? ORDER BY id ASC',
      [testRunId]
    );

    // Get release number
    const release = await db.get<{ release_number: string }>(
      'SELECT release_number FROM releases WHERE id = ?',
      [run.release_id]
    );

    // Ensure run directory exists
    const runDir = getRunDir(testRunId);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    // Generate HTML
    const html = generateHtmlReport(run, steps, release?.release_number);

    // Create PDF using Playwright
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfPath = path.join(runDir, 'report.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    });

    await browser.close();

    // Update database with PDF path
    await db.run('UPDATE test_runs SET pdf_path = ? WHERE id = ?', [pdfPath, testRunId]);

    console.log(`[PDF] Generated report for test run ${testRunId}: ${pdfPath}`);

    return { success: true, pdfPath };
  } catch (err) {
    const error = err as Error;
    console.error(`[PDF] Failed to generate report for test run ${testRunId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Get PDF path for a test run (generates if not exists)
 */
export async function getPdfPath(testRunId: number): Promise<string | null> {
  const db = getDb();

  // Check if PDF already exists in database
  const run = await db.get<{ pdf_path: string | null }>(
    'SELECT pdf_path FROM test_runs WHERE id = ?',
    [testRunId]
  );

  if (run?.pdf_path && fs.existsSync(run.pdf_path)) {
    return run.pdf_path;
  }

  // Check if PDF exists in run directory but not in database
  const runDir = getRunDir(testRunId);
  const pdfPath = path.join(runDir, 'report.pdf');

  if (fs.existsSync(pdfPath)) {
    // Update database
    await db.run('UPDATE test_runs SET pdf_path = ? WHERE id = ?', [pdfPath, testRunId]);
    return pdfPath;
  }

  return null;
}
