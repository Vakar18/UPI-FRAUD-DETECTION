# Quick Start – Full Stack

## Prerequisites
- Node.js 18+, Docker, Python 3.12+ (for ML service dev mode)

## 1. Start infrastructure
```bash
docker compose up -d
# MongoDB  → localhost:27018
# Redis    → localhost:6378
# ML svc   → localhost:5000  (trains Isolation Forest on first start ~20s)
# Redis UI → localhost:8081
```

## 2. Install & run NestJS backend
```bash
cp .env.example .env          # already configured for localhost defaults
npm install
npm run start:dev
```

## 2.5 Automated smoke test
```bash
npm run test:smoke:api
```

Optional overrides:
```bash
API_BASE_URL=http://localhost:3000/api/v1 npm run test:smoke:api
ML_HEALTH_URL=http://localhost:5000/health npm run test:smoke:api
```

## 3. URLs
| URL | What |
|-----|------|
| http://localhost:3000/docs   | Swagger – all REST endpoints |
| http://localhost:3000/queues | BullBoard – live job monitor |
| http://localhost:3000/demo/alerts-demo.html | Live alert demo page |
| http://localhost:5000/health | ML microservice health |

## 4. Test the full pipeline

### Ingest a single transaction
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "txnId": "TEST001",
    "senderId": "user123@oksbi",
    "receiverId": "merchant@hdfc",
    "amount": 350000,
    "deviceId": "DV-ABC123",
    "city": "Mumbai",
    "state": "Maharashtra",
    "transactionTime": "2024-04-09T02:30:00.000Z"
  }'
```
→ Returns 202 immediately. Watch BullBoard for the scoring job.

### CSV bulk upload
```bash
curl -X POST http://localhost:3000/api/v1/upload/csv \
  -F "file=@test-data/uploads/mixed-transactions.template.csv"
```

### Use the bundled fixtures directly
```bash
cat test-data/transactions/high-risk.template.json
cat test-data/uploads/mixed-transactions.template.csv
```

### Get dashboard stats
```bash
curl http://localhost:3000/api/v1/transactions/stats | jq .
```

### WebSocket (from browser console or wscat)
```js
const socket = io('http://localhost:3000/fraud');
socket.on('fraud-alert', (alert) => console.log('🚨 ALERT:', alert));
socket.on('txn-scored',  (txn)   => console.log('✅ SCORED:', txn));
socket.on('stats-update',(stats) => console.log('📊 STATS:', stats));
```

### Live demo page
Set `SIMULATOR_ENABLED=true` in `.env`, restart the Nest app, then open:
```bash
http://localhost:3000/demo/alerts-demo.html
```
You will see live `fraud-alert`, `txn-scored`, and `stats-update` events as
simulated transactions are generated and scored.

## 5. Run ML service in dev mode (without Docker)
```bash
cd ml-service
pip install -r requirements.txt
python app.py          # starts on port 5000, trains model on first run
```

## Architecture flow
```
POST /transactions
    │
    ▼
TransactionService
    ├── enrich (recentCount, isNewRecipient)
    ├── save to MongoDB (status=PENDING)
    └── BullMQ → SCORE_TRANSACTION_JOB
                        │
              TransactionProcessor
                        ├── MlService.score()
                        │     ├── HTTP POST /predict → Python ML (Isolation Forest)
                        │     └── rule-based fallback if Python unavailable
                        ├── MongoDB update (riskScore, riskLevel, status)
                        └── AlertPublisher.notify()
                                    │
                        FraudAlertGateway (Socket.io)
                                    ├── emit 'txn-scored'  → all clients
                                    └── emit 'fraud-alert' → HIGH/CRITICAL only
```
