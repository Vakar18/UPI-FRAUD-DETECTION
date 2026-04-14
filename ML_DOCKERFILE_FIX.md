# ✅ ML Service Dockerfile - FIXED

## What Was Fixed

**Error:** `"/app.py": not found` during Docker build

**Root Cause:** The Dockerfile had incorrect COPY paths:
- ❌ `COPY app.py .` (looking in root)
- ❌ `COPY requirements.txt .` (looking in root)

**Solution:** Updated to full paths from project root:
- ✅ `COPY src/modules/ml/app.py .`
- ✅ `COPY src/modules/ml/requirements.txt .`
- ✅ Also copies model files to `/app/models/`

---

## 🚀 What You Need to Do NOW

### Step 1: Push the Fixed Dockerfile to GitHub
```bash
cd /home/plutosone-vakar/upi-fraud-detection

# Commit the changes
git add src/modules/ml/Dockerfile
git commit -m "Fix Dockerfile paths for Railway deployment"
git push origin main
```

### Step 2: Redeploy ML Service on Railway
1. Go to **Railway Dashboard** → Your Project
2. Find your **ML Service**
3. Click on the ML Service 
4. Scroll down and click **"Deploy"** or **"Redeploy Latest"** button
5. Wait for build to complete (should see ✅ Success)

### Step 3: Check Deployment Logs
1. Go to **ML Service** → **"Logs"** tab
2. Look for successful build messages:
   ```
   ✅ Building Docker image...
   ✅ Installing Python dependencies...
   ✅ Copying application files...
   ✅ Starting application on port 5000
   ```

### Step 4: Get ML Service URL
1. In ML Service, look for **"Public Domain"** or **"URL"**
2. Copy the URL (should look like `https://ml-service-xxxx.up.railway.app`)

### Step 5: Update Backend with ML Service URL
1. Go to **Backend Service** (NestJS) → **"Variables"** tab
2. Find `ML_SERVICE_URL`
3. Update to your ML service URL:
   ```
   ML_SERVICE_URL=https://ml-service-xxxx.up.railway.app
   ```
4. Save (backend will auto-redeploy)

### Step 6: Verify Everything Works
```bash
# Test ML service health
curl https://ml-service-xxxx.up.railway.app/health

# Test backend can reach ML service
curl https://your-backend.up.railway.app/api/v1/health
```

**Expected responses:**
```
ML Service Health: { "status": "healthy", "model": "loaded" }
Backend Health: { "status": "ok", "ml_service": "connected" }
```

---

## 📊 Current File Structure (for reference)

```
/project-root/
├── Dockerfile                                    (NestJS backend)
├── Procfile                                      (Python app entry)
├── runtime.txt                                   (Python version)
├── src/
│   └── modules/
│       └── ml/
│           ├── Dockerfile                    ← FIXED ✅
│           ├── app.py                        ← Now correctly copied
│           ├── requirements.txt              ← Now correctly copied
│           ├── model.joblib                  ← Now correctly copied
│           └── scaler.joblib                 ← Now correctly copied
└── .git/
```

---

## 🎯 Estimated Time
- Push to GitHub: 1 minute
- Redeploy on Railway: 5 minutes
- Verify: 2 minutes
- **Total: ~8 minutes**

---

## ✅ Success Checklist
- [ ] Changes pushed to GitHub
- [ ] ML service redeployed on Railway
- [ ] Build log shows ✅ Success
- [ ] ML service health endpoint returns 200 OK
- [ ] Backend ML_SERVICE_URL updated
- [ ] Backend health shows ml_service connected
- [ ] Can submit test transaction

---

**Next: Follow the 6 steps above and you'll be live! 🚀**
