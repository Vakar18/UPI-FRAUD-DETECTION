# UPI Fraud Detection System – Backend (Part 1)

> AI-powered real-time fraud detection engine for UPI transactions  
> Built with **NestJS · MongoDB · Bull (Redis) · Swagger**

---

## Architecture overview

```
UPI Sources → [POST /transactions] → TransactionController
                                          │
                                    TransactionService
                                     ├── enrichment (recentCount, isNewRecipient)
                                     ├── TransactionRepository → MongoDB
                                     └── Bull Queue → TransactionProcessor
                                                           │
                                                     Rule-based scorer (Part 1)
                                                     ML microservice (Part 3)
                                                           │
                                                     MongoDB (risk fields updated)
                                                           │
                                                     Redis pub/sub → WebSocket (Part 4)
```

### Repository Pattern

```
Controller  →  Service  →  Repository  →  Mongoose Model  →  MongoDB
```

- **Controller** – HTTP concerns only (parse request, return response)
- **Service** – pure business logic, no Mongoose imports
- **Repository** – all DB queries, single source of truth for data access
- **Schema** – Mongoose document shape + indexes

---

## Quick start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Docker + Docker Compose | any recent |

### 1. Clone and install

```bash
git clone <your-repo>
cd upi-fraud-detection
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if you need custom ports
```

### 3. Start MongoDB + Redis

```bash
docker compose up -d
# MongoDB → localhost:27018
# Redis   → localhost:6378
# ML svc  → localhost:5000
# Redis Commander UI → http://localhost:8081
```

### 4. Run in dev mode

```bash
npm run start:dev
```

You should see:

```
[Bootstrap] Application running on http://localhost:3000/api/v1
[Bootstrap] Swagger UI → http://localhost:3000/docs
[Bootstrap] Alerts demo → http://localhost:3000/demo/alerts-demo.html
```

Quick links:
- **Swagger** → http://localhost:3000/docs
- **Bull Board** → http://localhost:3000/queues
- **Live Alerts Demo** → http://localhost:3000/demo/alerts-demo.html

If you enable `SIMULATOR_ENABLED=true` in `.env` and restart the app, the live
demo page will show real-time `fraud-alert`, `txn-scored`, and `stats-update`
events from simulated transactions.

---

## API Reference

### Base URL: `http://localhost:3000/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/transactions` | Ingest a new UPI transaction |
| `GET` | `/transactions` | List transactions (paginated + filtered) |
| `GET` | `/transactions/stats` | Dashboard aggregate statistics |
| `GET` | `/transactions/:txnId` | Single transaction detail |
| `PATCH` | `/transactions/:txnId/clear` | Analyst clears a flagged transaction |
| `GET` | `/health` | MongoDB health check |
| `GET` | `/health/simulator` | Simulator stats |

### POST `/transactions` – example payload

```json
{
  "txnId": "UPI1712345678901",
  "senderId": "vakar@oksbi",
  "receiverId": "merchant@hdfc",
  "amount": 250000,
  "currency": "INR",
  "deviceId": "DV-A1B2C3D4",
  "city": "Mumbai",
  "state": "Maharashtra",
  "ipAddress": "103.21.58.12",
  "deviceModel": "Samsung Galaxy S23",
  "transactionTime": "2024-04-09T02:35:00.000Z"
}
```

> Returns `202 Accepted` immediately. Risk scoring happens asynchronously via the queue.

### GET `/transactions/stats` – example response

```json
{
  "success": true,
  "data": {
    "riskDistribution": { "LOW": 210, "MEDIUM": 45, "HIGH": 18, "CRITICAL": 3 },
    "hourlyVolume": [{ "hour": 0, "count": 12, "flagged": 2 }, ...],
    "totalAmountFlagged": 184500000,
    "topFlaggedSenders": [{ "senderId": "user1234@oksbi", "count": 7 }],
    "generatedAt": "2024-04-09T10:30:00.000Z"
  }
}
```

### GET `/transactions?riskLevel=HIGH&page=1&limit=20`

Query parameters:

| Param | Type | Example |
|-------|------|---------|
| `riskLevel` | `LOW \| MEDIUM \| HIGH \| CRITICAL` | `HIGH` |
| `status` | `PENDING \| PROCESSING \| SCORED \| FLAGGED \| CLEARED \| FAILED` | `FLAGGED` |
| `senderId` | string | `vakar@oksbi` |
| `from` | ISO date | `2024-04-01T00:00:00Z` |
| `to` | ISO date | `2024-04-09T23:59:59Z` |
| `page` | number | `1` |
| `limit` | number (max 100) | `20` |
| `sortBy` | `createdAt \| amount \| riskScore` | `riskScore` |
| `sortOrder` | `asc \| desc` | `desc` |

---

## Project structure

```
src/
├── config/
│   └── app.config.ts          # All env vars, typed + namespaced
│
├── common/
│   └── filters/
│       └── http-exception.filter.ts   # Normalised error responses
│
├── modules/
│   ├── transactions/
│   │   ├── schemas/
│   │   │   └── transaction.schema.ts  # Mongoose schema + enums + indexes
│   │   ├── dto/
│   │   │   └── transaction.dto.ts     # Create / Query / UpdateRisk DTOs
│   │   ├── repositories/
│   │   │   └── transaction.repository.ts  # ALL Mongoose queries live here
│   │   ├── transaction.service.ts     # Business logic (no Mongoose imports)
│   │   ├── transaction.controller.ts  # HTTP layer (no business logic)
│   │   └── transaction.module.ts
│   │
│   ├── queue/
│   │   ├── queue.constants.ts         # Queue name + job name constants
│   │   └── transaction.processor.ts  # Bull consumer + rule-based scorer
│   │
│   ├── simulator/
│   │   ├── simulator.service.ts       # Fires mock transactions every N ms
│   │   └── simulator.module.ts
│   │
│   └── health/
│       ├── health.controller.ts       # /health + /health/simulator
│       └── health.module.ts
│
├── app.module.ts              # Root module (Mongo + Bull + Throttler)
└── main.ts                    # Bootstrap (Swagger + pipes + filters)
```

---

## Key design decisions (for interviews)

### 1. Repository Pattern
The `TransactionRepository` wraps all Mongoose calls. The service layer has zero Mongoose imports. This means:
- Unit-testing the service only requires mocking the repository interface
- Swapping MongoDB for another DB only requires changing the repository

### 2. Async ingestion (202 pattern)
The `POST /transactions` endpoint returns `202 Accepted` immediately after persisting. ML scoring happens asynchronously via Bull queue. This allows:
- Sub-5ms HTTP response time regardless of ML service latency
- ML service outages don't cause ingestion failures (jobs accumulate and drain)
- Horizontal scaling of the processor independently of the API layer

### 3. Behavioural enrichment before save
`recentTxnCount` and `isNewRecipient` are computed at ingestion time (before the queue job runs) so the ML processor has all signals available in one document read — no N+1 queries from the processor.

### 4. Idempotency
The `txnId` field has a unique index. A duplicate POST returns `409 Conflict`, making the ingestion endpoint safe to retry.

### 5. Compound indexes
Indexes are designed around the exact query patterns of the dashboard:
- `{ riskLevel: 1, createdAt: -1 }` for the flagged transactions list
- `{ senderId: 1, createdAt: -1 }` for per-sender history
- `{ status: 1, riskLevel: 1 }` for the analyst queue

---

## What comes next

| Part | What we build |
|------|---------------|
| **Part 2** | CSV bulk upload endpoint + streaming file parser |
| **Part 3** | Python ML microservice (Isolation Forest) replacing the rule-based stub |
| **Part 4** | WebSocket server + Redis pub/sub → real-time alerts to the browser |
| **Part 5** | Next.js dashboard (live charts, alert panel, transaction feed) |
| **Part 6** | Docker Compose for the full stack + deployment to AWS EC2 |
