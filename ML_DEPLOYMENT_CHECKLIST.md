# 🚀 ML Service Deployment - QUICK CHECKLIST (Do This Now)

Execute these steps in 15 minutes to deploy your ML service to Railway.

---

## ✅ Step 1: Push Deployment Files (2 min)

Railway deployment files are already created in your project:
- ✓ `Procfile` - tells Railway how to run the ML service
- ✓ `runtime.txt` - specifies Python version 3.12

Push them to GitHub:
```bash
cd /home/plutosone-vakar/upi-fraud-detection
git add Procfile runtime.txt
git commit -m "Add ML service deployment config for Railway"
git push origin main
```

Verify on GitHub that both files appear in your repo root.

---

## ✅ Step 2: Deploy ML Service on Railway (5 min)

### 2a. Open Railway Dashboard
```
1. Go to: railway.app
2. Login (same account as backend)
3. Click your project (same one with NestJS backend)
```

### 2b. Add New Service
```
1. Click "+ New Service" button
2. Choose "Deploy from GitHub repo"
3. Select "Existing repo"
4. Select: upi-fraud-detection
5. Click "Deploy"
```

**Railway will:**
- Detect the Procfile
- Recognize Python service
- Install dependencies from requirements.txt
- Start the Flask app

### 2c. Wait for Deployment
```
Watch the Logs tab:
- You should see installation progress
- Then: "Starting gunicorn..."
- Finally: "Successfully deployed"
- Takes about 2-3 minutes
```

---

## ✅ Step 3: Get ML Service URL (2 min)

### 3a. Find Your Service Domain
```
1. In Railway Dashboard
2. Click on the new ML service (should show python app)
3. Go to "Settings" tab
4. Look for "Domains" section
5. Copy the URL: https://upi-fraud-detection-xxxxx.railway.app
```

**Save this URL somewhere! You'll use it next.**

---

## ✅ Step 4: Test ML Service (2 min)

### 4a. Health Check
```bash
# Replace with your actual URL
curl https://upi-fraud-detection-xxxxx.railway.app/health

# Should return:
# {"status": "healthy", "model": "loaded"}
```

### 4b. Test Prediction
```bash
curl -X POST https://upi-fraud-detection-xxxxx.railway.app/predict \
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

# Should return something like:
# {"fraud_probability": 0.45, "risk_score": 45}
```

✓ If both tests pass → ML Service is working!

---

## ✅ Step 5: Update Backend Environment Variables (3 min)

### 5a. Open Your .env File
```bash
# File: /home/plutosone-vakar/upi-fraud-detection/.env

# Find this line:
ML_SERVICE_URL=http://localhost:5000

# Change it to YOUR ML SERVICE URL:
ML_SERVICE_URL=https://upi-fraud-detection-xxxxx.railway.app
```

### 5b. Save and Commit
```bash
git add .env
git commit -m "Update ML service URL from Railway deployment"
git push origin main
```

---

## ✅ Step 6: Update Backend in Railway (3 min)

This is important - tell your Railway backend about the new ML service URL.

### Option A: Via Railway Dashboard (Recommended)

```
1. Go to railway.app dashboard
2. Click your project
3. Click the "Backend" service (NestJS app)
4. Go to "Variables" tab
5. Find the line: ML_SERVICE_URL=http://localhost:5000
6. Change VALUE to: https://upi-fraud-detection-xxxxx.railway.app
7. Press Enter or click Save
8. Railway auto-redeploys backend (2-3 minutes)
9. Watch Logs tab until it says "Successfully deployed"
```

### Option B: Via .env File
```bash
# If you prefer to use .env:
vim .env

# Change:
ML_SERVICE_URL=http://localhost:5000

# To:
ML_SERVICE_URL=https://upi-fraud-detection-xxxxx.railway.app

git add .env
git commit -m "Update ML service URL"
git push origin main

# In Railway: Deployments tab → Trigger new deploy
```

---

## ✅ VERIFICATION - Is Everything Connected?

Run this test to verify your backend can reach the ML service:

```bash
# Create a test transaction through your API
curl -X POST https://your-backend.railway.app/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 75000,
    "senderId": "user_test_123",
    "recipientId": "user_test_456",
    "paymentMethod": "UPI"
  }'

# Look in the response for:
# "fraudProbability": <some number between 0 and 1>
# "riskScore": <some number between 0 and 100>

# If those appear → ✅ ML Service is working!
```

---

## 🔍 Common Issues & Fixes

### ❌ "ML Service URL is not found"
```
Issue: Railway says Procfile not found
Fix:
1. Verify Procfile exists: ls -la Procfile
2. Content should be: web: cd src/modules/ml && gunicorn --bind 0.0.0.0:$PORT app:app
3. Push to GitHub again
4. In Railway: click Redeploy
```

### ❌ "ML Service says 502 Bad Gateway"
```
Issue: Service is crashing
Fix:
1. Check ML service logs in Railway
2. Look for Python errors
3. Click "Redeploy" button
4. If still failing, message me
```

### ❌ "Backend timeout when calling ML Service"
```
Issue: ML Service not responding
Fixes:
1. Test ML service directly: curl https://your-ml-url/health
2. If returns 500, check ML service logs
3. Increase timeout in backend .env:
   ML_SERVICE_TIMEOUT=10000
4. Redeploy backend after changing this
```

### ❌ "Backend still says ML Service is localhost:5000"
```
Issue: .env change didn't take effect
Fix:
1. Verify you updated ML_SERVICE_URL in Railway Variables tab
2. Check it shows your Railway ML URL (not localhost)
3. Click Save to confirm
4. Wait 2-3 minutes for redeploy
5. Check backend logs for the new URL
```

---

## 📋 Your URLs After Deployment

Save these for reference:

```
Backend: https://your-backend.railway.app
ML Service: https://your-ml-service.railway.app
Health Check: https://your-ml-service.railway.app/health
Swagger Docs: https://your-backend.railway.app/api/v1/docs
```

---

## ⏱️ Total Time: ~15-20 minutes

| Step | Time | Status |
|------|------|--------|
| Push files to GitHub | 2 min | ⬜ |
| Deploy on Railway | 5 min | ⬜ |
| Get ML URL | 2 min | ⬜ |
| Test ML Service | 2 min | ⬜ |
| Update .env | 2 min | ⬜ |
| Update Railway backend | 3 min | ⬜ |
| Verify connection | 2 min | ⬜ |

---

## 🎯 Success Criteria

✅ All of these should be true:
- [ ] ML service health check returns {"status": "healthy"}
- [ ] ML service prediction endpoint works
- [ ] Backend .env has your ML service URL
- [ ] Backend in Railway shows new ML URL in Variables tab
- [ ] Backend logs show no "ML Service timeout" errors
- [ ] Transaction API includes fraud calculations
- [ ] No CORS errors in browser console

---

## 📞 Need Help?

Keep open:
1. [ML_SERVICE_DEPLOYMENT.md](./ML_SERVICE_DEPLOYMENT.md) - Full detailed guide
2. Railway Dashboard - For logs and debugging
3. Your terminal - For testing curl commands

---

**Start now! You'll be done in 15 minutes. 🚀**
