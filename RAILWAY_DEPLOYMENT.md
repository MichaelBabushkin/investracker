# Railway Deployment Checklist

## ✅ Pre-Deployment Setup (Complete these first)

### 1. Create GitHub Repository
- [ ] Go to https://github.com/new
- [ ] Name: `investracker`
- [ ] Make it **Private**
- [ ] Don't initialize with README (we have one)

### 2. Initialize Git and Push
```powershell
cd c:\Users\misha\OneDrive\Desktop\Investracker

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: World stocks + Israeli stocks tracking"

# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/investracker.git

# Push to main
git branch -M main
git push -u origin main

# Create develop branch
git checkout -b develop
git push -u origin develop
git checkout main
```

### 3. Remove Hardcoded Values (CRITICAL!)

#### Backend Files to Fix:

**File: `backend/app/services/israeli_stock_service.py`**
- [ ] Search for: `user_id = "user_123"`
- [ ] Replace with proper authentication (later)
- [ ] For now: Add `user_id: str` parameter to functions

**File: `backend/app/services/world_stock_service.py`**
- [ ] Search for: `user_id = "user_e31e99619f4c1930"`
- [ ] Replace with proper authentication (later)
- [ ] For now: Add `user_id: str` parameter to functions

**File: `backend/app/main.py`**
- [ ] Add `/health` endpoint for Railway healthcheck:
```python
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

## 🚀 Railway Deployment Steps

### Step 1: Create Railway Account
1. [ ] Go to https://railway.app
2. [ ] Click "Login"
3. [ ] Select "Login with GitHub"
4. [ ] Authorize Railway to access your repositories

### Step 2: Create New Project from GitHub
1. [ ] Click "New Project"
2. [ ] Select "Deploy from GitHub repo"
3. [ ] Choose `investracker` from the list
4. [ ] Railway will start analyzing your repo

### Step 3: Configure Backend Service
1. [ ] Railway creates a service automatically
2. [ ] Click on the service card
3. [ ] Go to "Settings" tab
4. [ ] Set **Root Directory**: `backend`
5. [ ] Set **Build Command**: `pip install -r requirements.txt`
6. [ ] Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. [ ] Click "Deploy"

### Step 4: Add PostgreSQL Database
1. [ ] In your Railway project, click "+ New"
2. [ ] Select "Database"
3. [ ] Choose "Add PostgreSQL"
4. [ ] Railway creates the database and connects it
5. [ ] The `DATABASE_URL` is automatically available to your backend

### Step 5: Set Environment Variables
1. [ ] Click on backend service → "Variables" tab
2. [ ] Add these variables:

```
DATABASE_URL → (Already set by Railway automatically)
SECRET_KEY → (Generate: openssl rand -hex 32)
CORS_ORIGINS → https://investracker.vercel.app,http://localhost:3000
UPLOAD_DIR → /tmp/uploads
ENVIRONMENT → production
```

To generate SECRET_KEY:
```powershell
# In PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Step 6: Run Database Migrations
1. [ ] Install Railway CLI:
```powershell
# Using npm
npm i -g @railway/cli

# Or using Scoop
scoop install railway
```

2. [ ] Login to Railway:
```powershell
railway login
```

3. [ ] Link to your project:
```powershell
cd c:\Users\misha\OneDrive\Desktop\Investracker\backend
railway link
```

4. [ ] Run migrations:
```powershell
railway run alembic upgrade head
```

### Step 7: Verify Deployment
1. [ ] Go to Railway dashboard
2. [ ] Click on backend service
3. [ ] Click "Deployments" → View latest
4. [ ] Check logs for errors
5. [ ] Copy your backend URL (e.g., `https://investracker-production.up.railway.app`)
6. [ ] Test: Open `https://YOUR-URL/health` in browser
7. [ ] Should see: `{"status": "healthy"}`

---

## 🎨 Vercel Deployment Steps

### Step 1: Create Vercel Account
1. [ ] Go to https://vercel.com
2. [ ] Click "Sign Up"
3. [ ] Choose "Continue with GitHub"
4. [ ] Authorize Vercel

### Step 2: Import Project
1. [ ] Click "Add New..." → "Project"
2. [ ] Find and select `investracker` repository
3. [ ] Click "Import"

### Step 3: Configure Project
1. [ ] Framework Preset: **Next.js** (auto-detected)
2. [ ] Root Directory: `frontend`
3. [ ] Build Command: `npm run build` (default)
4. [ ] Output Directory: `.next` (default)
5. [ ] Install Command: `npm install` (default)

### Step 4: Set Environment Variables
1. [ ] Click "Environment Variables"
2. [ ] Add:
```
Name: NEXT_PUBLIC_API_URL
Value: https://YOUR-RAILWAY-URL (from Railway deployment)
Environment: Production
```

3. [ ] Click "Add" to save
4. [ ] Add more for staging later if needed

### Step 5: Deploy
1. [ ] Click "Deploy"
2. [ ] Wait 2-3 minutes for build
3. [ ] You'll get a URL like: `https://investracker.vercel.app`
4. [ ] Click "Visit" to open your app

### Step 6: Update Railway CORS
1. [ ] Go back to Railway
2. [ ] Click backend service → "Variables"
3. [ ] Update `CORS_ORIGINS`:
```
https://investracker.vercel.app,http://localhost:3000
```
4. [ ] Railway auto-redeploys with new env var

---

## ✅ Post-Deployment Checklist

### Test Everything
- [ ] Open your Vercel URL
- [ ] Upload a test broker statement
- [ ] Check if data appears in holdings/transactions
- [ ] Verify dividends are showing
- [ ] Check dashboard widgets

### Set Up Automatic Deployments
- [ ] Push to `main` branch → Auto-deploys to production
- [ ] Push to `develop` branch → Can set up staging environment
- [ ] Create PR → Vercel creates preview deployment

### Update Documentation
- [ ] Add production URLs to README
- [ ] Document environment variables
- [ ] Add troubleshooting guide

---

## 🔧 Optional: Set Up Staging Environment

### Railway Staging
1. [ ] Create new Railway project for staging
2. [ ] Deploy `develop` branch
3. [ ] Use separate PostgreSQL database

### Vercel Staging
1. [ ] In Vercel project settings
2. [ ] Add environment for "Preview" deployments
3. [ ] Set `NEXT_PUBLIC_API_URL` to staging Railway URL

---

## 📊 Monitoring Setup (Future)

### Add to Railway
- [ ] Check "Metrics" tab for CPU/Memory usage
- [ ] Set up alerts for high usage
- [ ] Monitor database size

### Add to Vercel
- [ ] Enable Vercel Analytics (free)
- [ ] Check "Analytics" tab for page views
- [ ] Monitor Core Web Vitals

---

## 🎉 You're Done!

Your app is now:
- ✅ Deployed to production
- ✅ Using PostgreSQL database
- ✅ Auto-deploying on git push
- ✅ Secured with HTTPS
- ✅ Ready for users

**Next Steps:**
1. Add authentication (NextAuth.js)
2. Add Redis for background jobs
3. Set up cron jobs for daily updates
4. Add monitoring (Sentry)
5. Custom domain (optional)

---

## 🆘 Troubleshooting

### Backend won't start
- Check Railway logs: Service → Deployments → Logs
- Verify `DATABASE_URL` is set
- Check Python dependencies in `requirements.txt`

### Frontend can't reach backend
- Verify `NEXT_PUBLIC_API_URL` in Vercel
- Check CORS_ORIGINS in Railway includes Vercel URL
- Open browser console for CORS errors

### Database migration failed
- Run: `railway run alembic upgrade head`
- Check if tables already exist
- Review migration files in `backend/alembic/versions/`

### Railway deployment failed
- Check if `uvicorn` is in `requirements.txt`
- Verify `app.main:app` path is correct
- Check Railway build logs for Python errors
