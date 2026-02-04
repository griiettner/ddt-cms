# Action Items - Production Roadmap

## Overview

Migration plan to move the UAT Data-Driven Testing CMS from local development to Capital One production infrastructure.

**Infrastructure Available:**
- Aurora cluster (existing) → Create `uatcms` database
- Proxy login for database access (no separate DB user needed)
- Lambda deployment target
- 7PS external API to integrate

**Authentication Model:**
- Users authenticate via Capital One auth system
- User EID is captured from auth for `req.user`
- Database uses proxy login (single connection identity)

**Deferred to Later Phase:**
- Audit logging (tracking user actions by EID)

---

## Phase 1: Database Migration (SQLite → Aurora)

### 1.1 Aurora Database Setup

| # | Task | Description | Status |
|---|------|-------------|--------|
| 1 | Create `uatcms` database | Create new database in existing Aurora cluster | ⬜ |
| 2 | Get connection details | Host, port, proxy connection string | ⬜ |

### 1.2 Schema Migration

| # | Task | Description | Status |
|---|------|-------------|--------|
| 4 | Convert schema to Aurora SQL | Translate `server/db/migrations.ts` to PostgreSQL/MySQL DDL | ⬜ |
| 5 | Update data types | `INTEGER` → appropriate types, `BOOLEAN`, `TIMESTAMP` | ⬜ |
| 6 | Create indexes | Translate SQLite indexes to Aurora syntax | ⬜ |
| 7 | Run schema in Aurora | Execute DDL to create all tables | ⬜ |

### 1.3 Code Changes - Database Driver

| # | Task | File(s) | Description | Status |
|---|------|---------|-------------|--------|
| 8 | Replace `@libsql/client` | `package.json` | Install `pg` (PostgreSQL) or `mysql2` | ⬜ |
| 9 | Update database config | `server/db/config.ts` | New connection using Aurora credentials | ⬜ |
| 10 | Update query syntax | All `server/db/*.ts`, `server/routes/*.ts` | `?` → `$1,$2` (PostgreSQL) or keep `?` (MySQL) | ⬜ |
| 11 | Update transaction handling | All routes with transactions | Adapt `BEGIN/COMMIT/ROLLBACK` if needed | ⬜ |
| 12 | Add connection pooling | `server/db/config.ts` | Configure pool size for Lambda | ⬜ |
| 13 | Test all CRUD operations | - | Verify all routes work with Aurora | ⬜ |

### 1.4 Environment Configuration

| # | Task | Description | Status |
|---|------|-------------|--------|
| 14 | Add Aurora env variables | `DATABASE_URL` or individual `DB_HOST`, `DB_USER`, etc. | ⬜ |
| 15 | Remove SQLite references | Remove `data/` directory usage, libsql config | ⬜ |

---

## Phase 2: Lambda Deployment

### 2.1 Backend Restructuring

| # | Task | File(s) | Description | Status |
|---|------|---------|-------------|--------|
| 16 | Separate Express app | `server/index.ts` | Export `app` for Lambda handler | ⬜ |
| 17 | Create Lambda handler | New: `server/lambda.ts` | Wrap Express with serverless adapter | ⬜ |
| 18 | Install Lambda dependencies | `package.json` | Add `@vendia/serverless-express` or `serverless-http` | ⬜ |
| 19 | Handle cold starts | `server/db/config.ts` | Lazy DB connection initialization | ⬜ |
| 20 | Configure Lambda settings | - | Memory, timeout (consider test execution needs) | ⬜ |

### 2.2 Test Execution on Lambda

| # | Task | Description | Status |
|---|------|-------------|--------|
| 21 | **Decision**: Playwright on Lambda? | Lambda has 15min timeout, 10GB limit. Can tests run in time? | ⬜ |
| 22 | If yes: Package Playwright | Include Chromium in Lambda layer or use `playwright-aws-lambda` | ⬜ |
| 23 | If no: Alternative runtime | Use ECS Fargate or separate service for test execution | ⬜ |
| 24 | Update process spawning | `testExecutionQueue.ts`, `parallelTestExecution.ts` - adapt for Lambda | ⬜ |

### 2.3 Frontend Deployment

| # | Task | Description | Status |
|---|------|-------------|--------|
| 25 | Build frontend | `npm run build` | ⬜ |
| 26 | Deploy to S3 | Upload `dist/` to S3 bucket | ⬜ |
| 27 | Configure CloudFront | CDN distribution for frontend | ⬜ |
| 28 | Set API URL | Point frontend to Lambda API Gateway URL | ⬜ |

### 2.4 Infrastructure

| # | Task | Description | Status |
|---|------|-------------|--------|
| 29 | Set up API Gateway | REST/HTTP API for Lambda | ⬜ |
| 30 | Configure VPC | Lambda in VPC to access Aurora | ⬜ |
| 31 | Set up Secrets Manager | Store DB credentials securely | ⬜ |
| 32 | Configure CloudWatch | Logging and monitoring | ⬜ |

---

## Phase 3: Authentication Integration

### 3.1 Remove Mock Auth

| # | Task | File(s) | Description | Status |
|---|------|---------|-------------|--------|
| 32 | Remove mock user env vars | `.env` | Delete `MOCK_USER_EID`, `MOCK_USER_NAME` | ⬜ |
| 33 | Remove mock user middleware | `server/index.ts` | Remove lines 97-110 (identifyUser middleware) | ⬜ |

### 3.2 Integrate Real Auth

| # | Task | File(s) | Description | Status |
|---|------|---------|-------------|--------|
| 34 | Identify auth system | - | OAuth2/OIDC? SAML? Internal SSO? | ⬜ |
| 35 | Add auth middleware | `server/middleware/auth.ts` | Validate tokens on each request | ⬜ |
| 36 | Extract EID from auth | `server/middleware/auth.ts` | Parse user EID and name from auth token/headers | ⬜ |
| 37 | Populate `req.user` | `server/middleware/auth.ts` | Set `req.user.eid` and `req.user.name` | ⬜ |
| 38 | Protect all routes | `server/index.ts` | Apply auth middleware globally | ⬜ |

---

## Phase 4: 7PS API Integration

### 4.1 Understand Current Implementation

Current 7PS flow (internal):
```
Frontend (Run7PSModal)
  → POST /api/test-runs/execute-all
  → parallelTestExecution.ts spawns up to 7 Playwright processes
  → Results stored in test_runs table
```

### 4.2 Integrate External 7PS API

| # | Task | File(s) | Description | Status |
|---|------|---------|-------------|--------|
| 40 | Get 7PS API documentation | - | Endpoints, auth, request/response formats | ⬜ |
| 41 | Create 7PS API client | New: `server/services/sevenPSClient.ts` | HTTP client for 7PS API calls | ⬜ |
| 42 | Map test data to 7PS format | `server/services/sevenPSClient.ts` | Transform our test structure to 7PS expected input | ⬜ |
| 43 | Update execute-all endpoint | `server/routes/test-runs.ts` | Call 7PS API instead of internal execution | ⬜ |
| 44 | Handle 7PS async results | - | Webhook endpoint or polling for results | ⬜ |
| 45 | Store 7PS results | `server/routes/test-runs.ts` | Map 7PS results to our test_run_steps table | ⬜ |
| 46 | Update UI for 7PS status | `src/pages/TestSets/components/Run7PSModal.tsx` | Display 7PS-specific status/progress | ⬜ |

### 4.3 Decision: Keep Internal Execution?

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Replace entirely** | All execution goes through 7PS API | Single execution path | Loses local testing ability |
| **B: Hybrid** | 7PS for prod, internal for dev/local | Flexibility | Two code paths to maintain |

---

## Summary: Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Replace `@libsql/client` with `pg`/`mysql2`, add Lambda deps |
| `server/db/config.ts` | Aurora connection with pooling |
| `server/db/migrations.ts` | Convert to PostgreSQL/MySQL DDL |
| `server/routes/*.ts` | Update query placeholder syntax |
| `server/index.ts` | Export app, replace mock auth with real auth |
| `server/services/parallelTestExecution.ts` | Replace with 7PS API calls |
| `server/services/testExecutionQueue.ts` | Update for Lambda/7PS |
| `.env` | Aurora connection, remove mock user |
| New: `server/lambda.ts` | Lambda handler entry point |
| New: `server/middleware/auth.ts` | Real authentication middleware |
| New: `server/services/sevenPSClient.ts` | 7PS API integration |

---

## Questions to Resolve

| # | Question | Answer |
|---|----------|--------|
| 1 | Aurora engine? | PostgreSQL or MySQL? |
| 2 | Which auth system to integrate? | (Need to capture EID for audit tracking) |
| 3 | 7PS API documentation available? | |
| 4 | Can Playwright run in Lambda (15min limit)? | |
| 5 | How does 7PS return results (webhook/polling)? | |
| 6 | Migrate existing data or start fresh? | |

---

## Suggested Priority Order

1. **Database migration** (Phase 1) - Foundation for everything else
2. **Lambda deployment** (Phase 2) - Get app running in AWS
3. **Authentication** (Phase 3) - Security before production
4. **7PS integration** (Phase 4) - Final feature integration

---

## Later Phase (Not in Current Release)

- **Audit Logging** - Track all user actions by EID
  - Enable audit middleware
  - Log CREATE/UPDATE/DELETE actions to `audit_logs` table
  - Capture user EID, action, resource, old/new values, timestamps
