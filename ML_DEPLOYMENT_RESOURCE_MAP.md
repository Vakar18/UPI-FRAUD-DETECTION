# 🚀 ML Service Deployment - Complete Resource Index

All files and guides needed to deploy your ML service to Railway.

---

## 📁 Files Created for You

### Deployment Configuration Files (in project root)
```
✅ Procfile                              (NEW) 
   └─ Tells Railway how to run Python app
   └─ Content: web: cd src/modules/ml && gunicorn --bind 0.0.0.0:$PORT app:app

✅ runtime.txt                           (NEW)
   └─ Specifies Python version
   └─ Content: python-3.12.0
```

### Documentation Files (for reference)
```
✅ ML_SERVICE_DEPLOYMENT.md              (Comprehensive guide)
   └─ Full deployment process
   └─ Troubleshooting
   └─ Environment setup

✅ ML_DEPLOYMENT_CHECKLIST.md            (Quick action items)
   └─ 30-minute deployment checklist
   └─ Step-by-step instructions
   └─ Verification checklist

✅ ML_DEPLOYMENT_DETAILED.md             (Step-by-step with examples)
   └─ Detailed walkthrough with examples
   └─ Copy-paste commands
   └─ Screenshots (text descriptions)

✅ SYSTEM_ARCHITECTURE.md                (Visual guide)
   └─ How all systems connect
   └─ Data flow diagrams
   └─ Configuration reference

✅ ML_DEPLOYMENT_RESOURCE_MAP.md         (THIS FILE)
   └─ Navigation and quick reference
```

---

## 🎯 Which Document to Read Based on Your Needs

### "I want to deploy RIGHT NOW (get it done)" 
→ **Read:** [ML_DEPLOYMENT_CHECKLIST.md](./ML_DEPLOYMENT_CHECKLIST.md)
- 5 minutes to understand
- Step-by-step checklist format
- Exact commands copy-paste ready

### "I want detailed step-by-step with examples"
→ **Read:** [ML_DEPLOYMENT_DETAILED.md](./ML_DEPLOYMENT_DETAILED.md)
- Complete walkthrough
- All commands included
- Example outputs shown
- Troubleshooting included

### "I need the full technical guide"
→ **Read:** [ML_SERVICE_DEPLOYMENT.md](./ML_SERVICE_DEPLOYMENT.md)
- In-depth explanation
- All phases covered
- Advanced configuration
- Monitoring & debugging

### "I want to understand how everything connects"
→ **Read:** [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- Visual diagrams
- Data flow explained
- URL reference
- Integration points

---

## ⚡ Quick Start (15 minutes)

**If you only have 15 minutes, do this:**

1. **Terminal (2 min):**
   ```bash
   cd /home/plutosone-vakar/upi-fraud-detection
   git add Procfile runtime.txt .env
   git commit -m "Add ML deployment config"
   git push origin main
   ```

2. **Railway Dashboard (5 min):**
   - Click "+ New Service"
   - Select GitHub repo upi-fraud-detection
   - Watch deployment complete

3. **Get URL (2 min):**
   - Click ML service
   - Settings → Domains
   - Copy the URL

4. **Update Backend (3 min):**
   - Backend service → Variables
   - Change ML_SERVICE_URL to your new URL
   - Wait for redeploy

5. **Test (3 min):**
   ```bash
   curl https://your-ml-url/health
   curl -X POST https://your-backend/api/v1/transactions ...
   ```

**Done!** ✅

---

## 📋 Implementation Phases

### Phase 1: Preparation (2 minutes)
```
File: /Procfile (created) ✓
File: /runtime.txt (created) ✓
Task: Push to GitHub
```
→ Guide: [ML_DEPLOYMENT_CHECKLIST.md](./ML_DEPLOYMENT_CHECKLIST.md#-step-1-push-deployment-files-2-min)

### Phase 2: Deployment (5 minutes)
```
Action: Deploy on Railway
Status: ML service gets public URL
```
→ Guide: [ML_DEPLOYMENT_DETAILED.md](./ML_DEPLOYMENT_DETAILED.md#step-2-deploy-on-railway-5-minutes)

### Phase 3: Integration (7 minutes)
```
Action: Update backend ML_SERVICE_URL
Result: Backend knows where ML service is
```
→ Guide: [ML_DEPLOYMENT_CHECKLIST.md](./ML_DEPLOYMENT_CHECKLIST.md#-step-5-update-backend-environment-variables-3-min)

### Phase 4: Testing (3 minutes)
```
Action: Test endpoints
Result: Verify everything connected
```
→ Guide: [ML_DEPLOYMENT_DETAILED.md](./ML_DEPLOYMENT_DETAILED.md#step-7-verify-full-integration-2-minutes)

---

## 🔧 Key Commands You'll Need

### Push to GitHub
```bash
git add Procfile runtime.txt .env
git commit -m "ML service deployment config"
git push origin main
```

### Test ML Service Health
```bash
# Replace URL with your actual ML service URL
curl https://your-ml-service.railway.app/health

# Should return:
# {"status": "healthy", "model": "loaded"}
```

### Test ML Predictions
```bash
curl -X POST https://your-ml-service.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "senderId": "user123",
    "recipientId": "user456",
    "transactionsCount": 5,
    "isNewRecipient": 1,
    "dayOfWeek": 0,
    "hourOfDay": 14
  }'
```

### Test Full Integration
```bash
curl -X POST https://your-backend.railway.app/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 75000,
    "senderId": "user_test",
    "recipientId": "user_new",
    "paymentMethod": "UPI"
  }'
```

---

## 🎯 Expected Outcomes

### After Step 1 (Push to GitHub)
```
✓ Procfile visible on GitHub
✓ runtime.txt visible on GitHub
✓ Ready for Railway deployment
```

### After Step 2 (Deploy on Railway)
```
✓ ML service has public domain
✓ Service is running in container
✓ Logs show "Successfully deployed"
```

### After Step 3 (Update ML URL)
```
✓ Backend knows new ML service URL
✓ Backend redeployed automatically
✓ Logs show new URL in configuration
```

### After Step 4 (Test)
```
✓ Health endpoint returns 200 OK
✓ Prediction endpoint returns scores
✓ Backend successful transaction response includes ML data
```

---

## 📊 Your ML Deployment Status

| Component | Status | Location |
|-----------|--------|----------|
| Procfile | ✅ Created | `/Procfile` |
| runtime.txt | ✅ Created | `/runtime.txt` |
| Python app | ✅ Ready | `src/modules/ml/app.py` |
| Dependencies | ✅ Ready | `src/modules/ml/requirements.txt` |
| GitHub push | 🔲 TODO | Run: `git push` |
| Railway deploy | 🔲 TODO | Railway dashboard |
| Get ML URL | 🔲 TODO | Railway dashboard > Settings |
| Update .env | 🔲 TODO | Edit `.env` file |
| Update backend vars | 🔲 TODO | Railway dashboard > Backend |
| Test endpoints | 🔲 TODO | Run curl commands |

---

## 🚨 Common Issues & Quick Fixes

### "Procfile not found" error
```
Fix: 
1. Check: ls -la Procfile
2. Content must be exact: web: cd src/modules/ml && gunicorn --bind 0.0.0.0:$PORT app:app
3. No spaces before "web"
4. No extra characters at end
→ Guide: [ML_SERVICE_DEPLOYMENT.md](./ML_SERVICE_DEPLOYMENT.md#--procfile-not-found)
```

### "Backend can't reach ML service" (timeout)
```
Fix:
1. Verify ML_SERVICE_URL in Railway Variables
2. Should be: https://your-ml-service.railway.app
3. NOT: http://localhost:5000
4. NOT with trailing slash: .../health/
→ Guide: [ML_SERVICE_DEPLOYMENT.md](./ML_SERVICE_DEPLOYMENT.md#--backend-cant-reach-ml-service-timeout)
```

### "502 Bad Gateway from ML"
```
Fix:
1. Check ML service logs in Railway
2. Look for Python/gunicorn errors
3. Click Redeploy button
4. Increase timeout in backend .env: ML_SERVICE_TIMEOUT=10000
→ Guide: [ML_DEPLOYMENT_DETAILED.md](./ML_DEPLOYMENT_DETAILED.md)
```

### "ModuleNotFoundError" in ML service
```
Fix:
1. Verify requirements.txt at: src/modules/ml/requirements.txt
2. Contains all dependencies
3. Railway auto-installs during build
4. If missing, add to git and push
→ Guide: [ML_SERVICE_DEPLOYMENT.md](./ML_SERVICE_DEPLOYMENT.md#--modulnotfounderror-no-module-named-flask)
```

---

## 📞 Help Resources

```
If you have question about:

Deployment process
└─ Read: ML_DEPLOYMENT_DETAILED.md (step-by-step examples)

Environment setup
└─ Read: ML_SERVICE_DEPLOYMENT.md (phases & config)

System architecture
└─ Read: SYSTEM_ARCHITECTURE.md (connections & flow)

Troubleshooting
└─ Read: ML_SERVICE_DEPLOYMENT.md (troubleshooting section)

Quick reference
└─ Read: ML_DEPLOYMENT_CHECKLIST.md (actions needed)
```

---

## 🔗 External Resources

| Resource | Purpose | URL |
|----------|---------|-----|
| Railway Docs | Deployment platform | railway.app/docs |
| Flask Docs | Python web framework | flask.palletsprojects.com |
| Gunicorn Docs | WSGI server | gunicorn.org |
| scikit-learn | ML library | scikit-learn.org |
| GitHub | Version control | github.com |

---

## 📋 Complete Deployment Checklist

### Files & Config
- [ ] Procfile exists in project root
- [ ] runtime.txt exists in project root
- [ ] .env has ML_SERVICE_URL (will update)
- [ ] src/modules/ml/app.py exists
- [ ] src/modules/ml/requirements.txt exists

### GitHub
- [ ] Push files to GitHub
- [ ] Verify files appear on GitHub website
- [ ] Branch is "main" or "master"

### Railway Deployment
- [ ] Railway account active
- [ ] Project already has backend & Redis
- [ ] Click "+ New Service"
- [ ] Deploy from GitHub
- [ ] Select upi-fraud-detection repo
- [ ] Wait for deployment complete

### Get ML URL
- [ ] Click deployed ML service
- [ ] Go to Settings tab
- [ ] Find Domains section
- [ ] Copy public URL
- [ ] Save URL in safe place

### Testing
- [ ] Health check: curl .../health
- [ ] Prediction test: curl -X POST .../predict
- [ ] Response includes fraud_probability

### Backend Update
- [ ] .env updated with ML URL
- [ ] .env committed to Git
- [ ] Railway backend Variables updated
- [ ] Backend ML_SERVICE_URL = new ML URL
- [ ] Wait for backend redeploy

### Integration Tests
- [ ] Backend logs show ML calls
- [ ] Transaction response includes riskScore
- [ ] Transaction response includes fraudProbability
- [ ] No timeout errors in logs
- [ ] All systems connected

---

## ⏱️ Timeline

```
Activity                    Time    Cumulative
────────────────────────────────────────────────
1. Push to GitHub          2 min   2 min
2. Railway deploy          5 min   7 min
3. Get ML URL              2 min   9 min
4. Test ML service         2 min   11 min
5. Update .env             2 min   13 min
6. Update backend vars     2 min   15 min
7. Verify integration      3 min   18 min

Total: ~18 minutes
```

---

## ✅ Quick Verification

After everything is deployed, run:

```bash
# 1. Test ML directly
curl https://your-ml-url/health
# Should return: {"status": "healthy"}

# 2. Test from backend
curl -X POST https://your-backend/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "senderId": "u1", "recipientId": "u2", "paymentMethod": "UPI"}'

# Response should include:
# "fraudProbability": <value between 0 and 1>
# "riskScore": <value between 0 and 100>

# If both work → ✅ You're done!
```

---

## 🎉 Next Steps

After ML service is deployed:

1. ✅ ML service live on Railway
2. ✅ Backend connected to ML service
3. 📋 Deploy frontend (separate task)
4. 📋 Connect frontend to backend
5. 📋 Test end-to-end (UI → API → ML)
6. 📋 Monitor production

---

## 📁 File Directory Reference

```
upi-fraud-detection/
├── Procfile                          ← NEW (Railway config)
├── runtime.txt                       ← NEW (Python version)
├── .env                              ← WILL UPDATE (ML URL)
├── ML_SERVICE_DEPLOYMENT.md          ← FULL GUIDE
├── ML_DEPLOYMENT_CHECKLIST.md        ← QUICK CHECKLIST
├── ML_DEPLOYMENT_DETAILED.md         ← STEP-BY-STEP
├── SYSTEM_ARCHITECTURE.md            ← DIAGRAM & FLOW
├── ML_DEPLOYMENT_RESOURCE_MAP.md     ← THIS FILE
└── src/modules/ml/
    ├── app.py                        ← Flask app (ready)
    ├── requirements.txt              ← Dependencies (ready)
    ├── Dockerfile                    ← For local Docker
    ├── train.py
    ├── model.joblib
    └── scaler.joblib
```

---

**Ready to deploy? Start with [ML_DEPLOYMENT_CHECKLIST.md](./ML_DEPLOYMENT_CHECKLIST.md)!**

All files created and ready. Follow the checklist - you'll be done in 15 minutes! 🚀
