# Deployment Proposal (AWS)

This document proposes three deployment options for the Test Execution Architecture (Express API + Playwright runner + 7PS CLI), based on the current constraints and planned changes:

- No API Gateway
- Migration planned from SQLite to Aurora PostgreSQL
- No CloudFront
- Access to: Lambda and/or Fargate
- S3 is available
- Corporate proxy exists at the top layer and can provide HTTPS termination

## Architecture Summary (from diagram)

- Entry points: Web UI (React), CLI script (`scripts/run-7ps.sh`), external systems (curl/CI/CD)
- REST API: Express.js endpoints
  - `POST /api/test-runs/execute/:testSetId` (single)
  - `POST /api/test-runs/execute-all` (7PS batch)
  - `GET /api/test-runs/batch/:id/status`
  - `GET /api/test-runs/batch/:id/details`
- Backend services:
  - `testExecutionQueue.ts`: FIFO single-run queue
  - `parallelTestExecution.ts`: up to 7 concurrent runs
- Execution:
  - Spawns child process: `npx tsx tests/runner.ts`
  - Playwright browser runs and generates artifacts
- Outputs:
  - Database (migrating from SQLite to Aurora PostgreSQL; tables include `test_runs`, `test_run_steps`)
  - Cucumber JSON reports
  - PDFs on-demand
  - Videos and screenshots

## Option 1: Fargate-Only (Recommended Default)

### Summary
Run the full API + execution runtime in a single ECS Fargate service behind an ALB. Package Playwright and 7PS CLI directly into the container image.

### Components
- **UI:** S3 static hosting
- **API + Runner:** ECS Fargate service (single task)
- **Ingress:** ALB (HTTP), corporate proxy handles HTTPS termination
- **Storage:**
  - Aurora PostgreSQL for application state
  - Artifacts stored locally or pushed to S3

### Pros
- Best compatibility with Playwright (browser dependencies, video, screenshots)
- Simple operational model
- 7PS CLI install is straightforward in the container image
- Stable child process spawning and long-running tests

### Cons
- Always-on cost (single task running continuously)
- Horizontal scaling still requires care for runner concurrency (MAX_CONCURRENT=7), but Aurora removes SQLite lock contention

### Notes
- This is the safest path for predictable execution.
- If S3 is used for artifacts, UI can fetch artifacts directly (via proxy).

## Option 2: Lambda-Only (Not Ideal for Playwright)

### Summary
Use Lambda for API endpoints and test execution. Each test run happens inside a Lambda invocation.

### Components
- **UI:** S3 static hosting
- **API + Runner:** Lambda
- **Ingress:** ALB to Lambda or Lambda Function URL (HTTP), corporate proxy handles HTTPS
- **Storage:**
  - Aurora PostgreSQL for application state
  - Artifacts must be pushed to S3

### Pros
- Low idle cost
- Automatic scaling
- Minimal infrastructure

### Cons
- Playwright on Lambda is brittle (browser deps, package size, cold starts)
- Execution time limits risk long test batches
- Child process spawning and progress streaming are harder
- 7PS CLI install must be bundled or layered, increasing deployment size

### Notes
This option is high-risk for stable Playwright and 7PS batch execution. It may work for small tests but is not recommended for current workloads.

## Option 3: Hybrid (Lambda API + Fargate Runners)

### Summary
Use Lambda for the API layer and orchestration. Use Fargate tasks for execution runs (single or 7PS batch).

### Components
- **UI:** S3 static hosting
- **API:** Lambda
- **Execution:** ECS Fargate tasks (on-demand)
- **Ingress:** ALB or Function URL (HTTP), corporate proxy handles HTTPS
- **Storage:**
  - Aurora PostgreSQL for application state
  - Artifacts to S3

### Pros
- API scales cheaply and independently
- Playwright execution runs in a stable container environment
- Each run can be isolated in its own task
- 7PS CLI installed only in runner image

### Cons
- More orchestration complexity
- Requires a reliable place to store status/progress (Aurora covers this)

### Notes
This is a good fit if you expect bursty execution and want to keep the API lightweight.

## HTTPS Strategy (Given Constraints)

Since CloudFront is not available and a corporate proxy exists:

- **Terminate HTTPS at the corporate proxy/ingress layer**
- Proxy routes:
  - `/` (UI) -> S3 static website endpoint
  - `/api/*` -> ALB or Lambda Function URL (HTTP upstream)

This provides HTTPS + corporate DNS without requiring CloudFront.

## Recommendation

- **Primary recommendation:** Option 1 (Fargate-only)
  - Lowest risk for Playwright and child process orchestration
  - Simple to operate
- **If you need API elasticity:** Option 3 (Hybrid)
  - Lambda API with Fargate runners
  - Requires added orchestration and S3-based artifact storage

## Open Decisions

- Whether ALB is allowed (for Fargate services)
- Whether EFS is allowed (optional, for shared artifact volume or large files)
- Required data retention for reports/videos/screenshots
- Max test duration expectations (affects Lambda feasibility)
