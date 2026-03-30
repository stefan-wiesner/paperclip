# System Architecture and Tech Stack

**SECAA — Security AI Analysis**
**Issue:** SECAA-9
**Author:** CEO Agent
**Date:** March 30, 2026
**Status:** Approved for Implementation

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│   Web Dashboard (React)          Mobile (Future)     API Clients     │
└────────────────┬─────────────────────────────────┬───────────────────┘
                 │                                 │
                 ▼                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                            │
│              Auth (JWT)  │  Rate Limiter  │  Router                  │
└────────────────┬─────────┴────────────────┴────────────────────────────┘
                 │
       ┌─────────┴────────────────────────────────────┐
       │              CORE SERVICES                    │
       │  ┌──────────────┐  ┌──────────────────────┐  │
       │  │  Auth Svc    │  │  Scan Orchestrator   │  │
       │  │  - OAuth     │  │  - Job queue         │  │
       │  │  - Sessions  │  │  - Worker pool       │  │
       │  │  - Users     │  │  - Result aggregator │  │
       │  └──────────────┘  └──────────────────────┘  │
       │  ┌──────────────┐  ┌──────────────────────┐  │
       │  │  Project Svc │  │  LLM Analysis Svc    │  │
       │  │  - Repos     │  │  - Claude client     │  │
       │  │  - Webhooks  │  │  - Prompt templates  │  │
       │  │  - Settings  │  │  - Result parser     │  │
       │  └──────────────┘  └──────────────────────┘  │
       │  ┌──────────────┐  ┌──────────────────────┐  │
       │  │  Findings Svc│  │  GitHub Integration  │  │
       │  │  - CRUD      │  │  - Webhook handler    │  │
       │  │  - Search    │  │  - Security API      │  │
       │  │  - Filter    │  │  - Issue creator     │  │
       │  └──────────────┘  └──────────────────────┘  │
       └──────────────────────┬────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
┌────────────────────────┐   ┌─────────────────────────────────────┐
│     DATA LAYER          │   │         EXTERNAL SERVICES            │
│  ┌──────────────────┐   │   │  ┌─────────────┐ ┌───────────────┐  │
│  │   PostgreSQL     │   │   │  │  GitHub API │ │  Claude API   │  │
│  │  - Users         │   │   │  │  (REST)     │ │  (Anthropic)  │  │
│  │  - Projects      │   │   │  └─────────────┘ └───────────────┘  │
│  │  - Repos         │   │   │  ┌─────────────┐ ┌───────────────┐  │
│  │  - Scans         │   │   │  │  GitHub     │ │  Email        │  │
│  │  - Findings      │   │   │  │  Webhooks   │ │  (Resend)     │  │
│  │  - Audit log     │   │   │  └─────────────┘ └───────────────┘  │
│  └──────────────────┘   │   └─────────────────────────────────────┘
│  ┌──────────────────┐    │
│  │   Redis          │    │
│  │  - Job queue     │    │
│  │  - Cache         │    │
│  │  - Sessions      │    │
│  └──────────────────┘    │
│  ┌──────────────────┐    │
│  │   S3 / Blob       │    │
│  │  - Scan artifacts │    │
│  │  - Code snapshots │    │
│  │  - Report exports │    │
│  └──────────────────┘    │
└──────────────────────────┘
```

---

## 2. Tech Stack Decisions

### 2.1 Backend

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Language** | TypeScript (Node.js) | Shared types with frontend, strong ecosystem, good LLM library support |
| **Runtime** | Node.js 20 LTS | Stable, good performance, native ESM support |
| **Framework** | Fastify | 30-40% faster than Express, built-in validation with JSON Schema, better TypeScript support |
| **Runtime Env** | Deno (future) | Secure by default, better TypeScript support — migrate post-MVP |

**Rejected alternatives:**
- **Python/FastAPI:** Good for ML but adds TypeScript↔Python interop complexity. TypeScript is sufficient for LLM API calls.
- **Rust:** Overkill for MVP velocity. Revisit for hot paths post-MVP.

### 2.2 Frontend

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | React 18 + Vite | Fast dev server, good ecosystem, Paperclip UI precedent |
| **Language** | TypeScript | Type safety across stack |
| **Styling** | Tailwind CSS | Rapid iteration, consistent design system |
| **State** | Zustand | Minimal boilerplate, good for dashboard state |
| **Charts** | Recharts | Simple, React-native, MIT licensed |
| **Forms** | React Hook Form + Zod | Best-in-class validation |

### 2.3 Database

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Primary DB** | PostgreSQL 15 | ACID compliance, JSONB for flexible findings schema, mature |
| **ORM** | Drizzle ORM | Type-safe, lightweight, better than Prisma for our use case, SQL-like |
| **Cache/Queue** | Redis 7 | Job queue, session cache, rate limiting |
| **Object Storage** | AWS S3 (or compatible) | Scan artifacts, code snapshots |

### 2.4 LLM Integration

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Primary Provider** | Claude (Anthropic) | Best coding/security context understanding, 200K context window |
| **Fallback** | GPT-4o (OpenAI) | Routing-based fallback for cost/scale |
| **Client** | Official Anthropic SDK | TypeScript support, streaming, retries |
| **Prompt Management** | Versioned templates in DB | Runtime updates without redeploy |

### 2.5 Infrastructure

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Cloud** | AWS | Mature, best GitHub integration (CodeStar), good for SaaS |
| **Containers** | Docker + AWS ECS Fargate | No server management, good scaling |
| **CI/CD** | GitHub Actions | Tight GitHub integration, good for security product |
| **Secrets** | AWS Secrets Manager | Rotation, audit logging |
| **DNS/CDN** | Route 53 + CloudFront | Latency, DDoS protection |
| **Email** | Resend | Great DX, React Email support |

---

## 3. Core Pipeline Architecture

### 3.1 Scan Pipeline

```
GitHub Push/PR
     │
     ▼
Webhook Ingestion ──────────────► Rate Limiter ──► Queue (Redis/BullMQ)
     │                                                        │
     │                                                 ┌──────┴──────┐
     │                                                 ▼             ▼
     │                                          ┌─────────┐   ┌─────────┐
     │                                          │ Worker 1│   │ Worker 2│ ...
     │                                          └────┬────┘   └────┬────┘
     │                                               │             │
     │                                    ┌──────────┴─────────────┘
     │                                    ▼
     │                          ┌──────────────────────┐
     │                          │  Code Fetcher        │
     │                          │  (GitHub API → S3)   │
     │                          └──────────┬───────────┘
     │                                             │
     │                                             ▼
     │                          ┌──────────────────────────┐
     │                          │  File Chunker            │
     │                          │  (Split by repo/file)    │
     │                          └──────────┬───────────────┘
     │                                            │
     │                          ┌─────────────────┴─────────────────┐
     │                          ▼                                   ▼
     │               ┌──────────────────┐              ┌──────────────────┐
     │               │  LLM Analyzer    │              │  LLM Analyzer    │
     │               │  (Claude - AST)  │              │  (Claude - Sec)  │
     │               └────────┬─────────┘              └────────┬─────────┘
     │                        │                                   │
     │                        └─────────────┬─────────────────────┘
     │                                     ▼
     │                          ┌──────────────────────┐
     │                          │  Result Aggregator   │
     │                          │  - Deduplicate       │
     │                          │  - Rank by severity  │
     │                          │  - Score confidence  │
     │                          └──────────┬───────────┘
     │                                             │
     │                                             ▼
     │                          ┌──────────────────────────────┐
     │                          │  Finding Store (PostgreSQL)  │
     │                          │  + Artifact Store (S3)       │
     │                          └──────────┬───────────────────┘
     │                                            │
     │                           ┌───────────────┴────────────────┐
     │                           ▼                               ▼
     │              ┌─────────────────────┐         ┌─────────────────────────┐
     │              │  GitHub Integration  │         │  Notification Service   │
     │              │  - Security Findings │         │  - Email                │
     │              │  - Issues            │         │  - Dashboard            │
     │              │  - PR Comments       │         │                         │
     │              └─────────────────────┘         └─────────────────────────┘
```

### 3.2 LLM Analysis Strategy

**Phase 1: Quick Scan (Fast, Broad)**
- Prompt: "Identify potential security issues in this code"
- Files: All files, chunked
- Goal: High recall, flag anything suspicious

**Phase 2: Deep Analysis (Slow, Precise)**
- Prompt: "Analyze this vulnerability in context"
- Files: Only flagged files + their dependencies
- Goal: High precision, reduce false positives

**Phase 3: Remediation Generation**
- Prompt: "Suggest fixes for these vulnerabilities"
- Output: Code patches + explanations
- Goal: Actionable results

### 3.3 Chunking Strategy

- **Max chunk size:** 8K tokens (Claude 3.5 Sonnet context)
- **Overlap:** 512 tokens between chunks
- **File grouping:** Group by directory for dependency context
- **Ignore patterns:** `node_modules/`, `*.min.js`, `dist/`, `.git/`

---

## 4. API Design

### 4.1 REST Endpoints

```
Authentication:
POST   /api/auth/register        - Email/password signup
POST   /api/auth/login           - Login
POST   /api/auth/logout          - Logout
POST   /api/auth/refresh         - Refresh token
GET    /api/auth/github          - Initiate GitHub OAuth
GET    /api/auth/github/callback - OAuth callback

Users:
GET    /api/users/me             - Get current user
PATCH  /api/users/me             - Update profile
DELETE /api/users/me             - Delete account

Projects:
GET    /api/projects             - List user's projects
POST   /api/projects             - Create project
GET    /api/projects/:id         - Get project
PATCH  /api/projects/:id         - Update project
DELETE /api/projects/:id         - Delete project

Repositories:
GET    /api/projects/:id/repos              - List repos in project
POST   /api/projects/:id/repos              - Connect repo
DELETE /api/projects/:id/repos/:repoId      - Disconnect repo
GET    /api/projects/:id/repos/:repoId/scan  - Trigger scan

Scans:
GET    /api/scans                 - List scans
GET    /api/scans/:id             - Get scan status/results
POST   /api/scans/:id/cancel      - Cancel scan

Findings:
GET    /api/findings              - List findings (filterable)
GET    /api/findings/:id          - Get finding detail
PATCH  /api/findings/:id          - Update (mark resolved/false positive)
POST   /api/findings/:id/comments - Add comment

Webhooks (GitHub):
POST   /api/webhooks/github       - Receive GitHub webhooks
```

### 4.2 Response Format

```typescript
// Success
{
  "data": T,
  "meta": {
    "page": number,
    "pageSize": number,
    "total": number
  }
}

// Error
{
  "error": {
    "code": string,
    "message": string,
    "details": unknown
  }
}
```

---

## 5. Data Model

### 5.1 Core Entities

```typescript
// User
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  githubId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project
interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Repository
interface Repository {
  id: string;
  projectId: string;
  githubRepoId: number;
  name: string;
  fullName: string;        // "owner/repo"
  defaultBranch: string;
  webhookId?: string;      // GitHub webhook ID
  settings: RepoSettings;
  lastScanAt?: Date;
  createdAt: Date;
}

// Scan
interface Scan {
  id: string;
  repositoryId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: 'manual' | 'webhook' | 'scheduled';
  commitSha?: string;
  branch: string;
  stats: {
    filesAnalyzed: number;
    linesScanned: number;
    duration: number;      // seconds
    cost?: number;          // USD
  };
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Finding
interface Finding {
  id: string;
  scanId: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;      // 0-1
  category: string;        // e.g., "sql_injection", "secret_leak"
  title: string;
  description: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  remediation: string;
  status: 'open' | 'resolved' | 'false_positive' | 'ignored';
  cweId?: string;          // CWE reference
  owaspRef?: string;       // OWASP reference
  createdAt: Date;
  resolvedAt?: Date;
}
```

### 5.2 Indexing Strategy

- `findings(scanId, status)` — List findings per scan
- `findings(repositoryId, severity, createdAt)` — Dashboard queries
- `scans(repositoryId, createdAt)` — Scan history
- `repositories(projectId, userId)` — User's repos

---

## 6. Security Considerations

### 6.1 Authentication & Authorization

- **JWT tokens** with 15-min access / 7-day refresh
- **RBAC:** Owner, Admin, Member roles per project
- **GitHub OAuth** scopes: `repo` (full), `read:user`, `notifications`
- **API keys** for future third-party access

### 6.2 Data Security

- **Encryption at rest:** PostgreSQL (AES-256), S3 (SSE-S3)
- **Encryption in transit:** TLS 1.3 everywhere
- **Secrets management:** AWS Secrets Manager, never in env vars in containers
- **Audit logging:** All mutating actions logged with actor + timestamp

### 6.3 LLM Security

- **No repo data retention:** Code only in memory during scan, not stored
- **Prompt injection prevention:** Sanitize file names, user-provided strings
- **Cost controls:** Per-user/monthly token limits, auto-pause on threshold

### 6.4 Privacy

- **Minimal data collection:** Only store findings, not full code
- **User deletion:** Full data deletion on account removal
- **GDPR compliance:** Export, delete endpoints

---

## 7. Deployment Architecture

### 7.1 Environments

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Account                              │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Dev       │  │  Staging    │  │      Production         │  │
│  │  ECS Fargate│  │  ECS Fargate│  │     ECS Fargate         │  │
│  │  - Dev DB   │  │  - Stage DB │  │     - Prod DB (RDS)     │  │
│  │  - Local S3 │  │  - S3       │  │     - Multi-AZ RDS      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Shared Services                          ││
│  │  - Redis (ElastiCache)  - S3 (Artifacts)  - Route 53         ││
│  │  - CloudFront          - Secrets Manager                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 CI/CD Pipeline

```
Push to main ──► GitHub Actions ──► Build Docker Image ──► Push to ECR
                                                              │
                                                              ▼
                                           ┌──────────────────────────┐
                                           │  Deploy to Staging       │
                                           │  - Run tests             │
                                           │  - Run migrations        │
                                           │  - Smoke tests           │
                                           └──────────┬───────────────┘
                                                      │ All green
                                                      ▼
                                           ┌──────────────────────────┐
                                           │  Deploy to Production     │
                                           │  - Blue/green deploy      │
                                           │  - Health checks          │
                                           └──────────────────────────┘
```

---

## 8. Open Questions / Deferred Decisions

| Question | Decision | Notes |
|----------|----------|-------|
| Multi-tenant isolation | Single DB with companyId | Revisit if >1000 companies |
| File storage encryption key management | AWS KMS | Defer until SOC2 |
| LLM fallback routing logic | Simple priority-based | Add smart routing post-MVP |
| Scan concurrency per user | 1 concurrent scan | 3 for paid tiers |
| Code snapshot retention | 7 days | 30 days for paid |

---

## 9. Implementation Phases

### Phase 1: Core MVP (SECAA-9 → SECAA-10)
- [x] SECAA-8: PRD and MVP scope
- [ ] SECAA-9: This document — finalize tech stack
- [ ] SECAA-10: Build core scan pipeline
- [ ] Basic dashboard with findings list
- [ ] GitHub OAuth integration
- [ ] Manual scan trigger

### Phase 2: Automation (Post-MVP)
- [ ] GitHub webhook integration
- [ ] GitHub Security Findings API
- [ ] Email notifications
- [ ] Auto-remediation suggestions

### Phase 3: Scale
- [ ] GPT-4o fallback routing
- [ ] Multi-language support (Python, Go)
- [ ] Team features / RBAC
- [ ] API access for third parties

---

*Document status: APPROVED — proceed to implementation.*
