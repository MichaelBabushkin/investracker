# 🚂 Railway Deployment - Step by Step (TODAY!)

## ⏱️ Total Time: ~20 minutes

---

## Step 1: Create Railway Account (2 minutes)

1. Open browser and go to: **https://railway.app**

2. Click **"Login"** (top right)

3. Click **"Login with GitHub"**

4. Authorize Railway to access your GitHub repositories
   - Click "Authorize Railway"
   - You'll be redirected back to Railway

5. You should see Railway dashboard with "New Project" button

✅ **You're logged in!**

---

## Step 2: Create New Project from GitHub (3 minutes)

1. Click **"New Project"** (big button in center or top right)

2. You'll see options - click **"Deploy from GitHub repo"**

3. You'll see a list of your repos - find and click **"investracker"**
   - If you don't see it, click "Configure GitHub App" to grant access

4. Railway will analyze your repo (~10 seconds)

5. Railway detects it's a monorepo and shows options:
   - You'll see it found multiple potential services
   - Click on the one that looks like your backend

✅ **Project created!**

---

## Step 3: Configure Backend Service (5 minutes)

1. Railway creates a service card automatically
   - You'll see a purple/blue card with your service name

2. Click on the service card to open it

3. Click **"Settings"** tab (left sidebar)

4. Scroll to **"Root Directory"**:
   - Click "Edit"
   - Type: `backend`
   - Click "Save" or press Enter

5. Scroll to **"Start Command"** (might be called "Custom Start Command"):
   - Click "Edit"
   - Type: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Click "Save"

6. Scroll to **"Health Check Path"** (optional but recommended):
   - Click "Edit"
   - Type: `/health`
   - Click "Save"

7. Railway will automatically trigger a deployment
   - You'll see "Deploying..." at the top
   - Wait ~2-3 minutes for first build

✅ **Backend configured and deploying!**

---

## Step 4: Add PostgreSQL Database (2 minutes)

1. Go back to your project view (click project name at top, or press ESC)

2. Click **"+ New"** button (top right)

3. Select **"Database"**

4. Click **"Add PostgreSQL"**

5. Railway creates the database instantly
   - You'll see a new card for PostgreSQL
   - It automatically connects to your backend service
   - The `DATABASE_URL` environment variable is auto-set

6. Click on the PostgreSQL card to see details
   - You can see connection info, but you don't need to copy anything
   - Railway handles the connection automatically!

✅ **Database added and connected!**

---

## Step 5: Set Environment Variables (3 minutes)

1. Click on your **backend service card** (not the database)

2. Click **"Variables"** tab (left sidebar)

3. You'll see `DATABASE_URL` is already there (set by Railway automatically)

4. Click **"+ New Variable"** button

5. Add **SECRET_KEY**:
   ```
   Name:  SECRET_KEY
   Value: (see below to generate)
   ```

   **To generate SECRET_KEY in PowerShell:**
   ```powershell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
   ```
   Copy the output and paste as the value

6. Add **CORS_ORIGINS**:
   ```
   Name:  CORS_ORIGINS
   Value: http://localhost:3000
   ```
   (We'll update this after deploying Vercel)

7. Add **UPLOAD_DIR**:
   ```
   Name:  UPLOAD_DIR
   Value: /tmp/uploads
   ```

8. Railway auto-redeploys when you add variables
   - Wait another ~2 minutes for redeployment

✅ **Environment variables set!**

---

## Step 6: Get Your Backend URL (1 minute)

1. Click on your **backend service card**

2. Click **"Settings"** tab

3. Scroll to **"Networking"** section

4. You'll see **"Public Networking"**
   - If it says "Generate Domain", click it
   - Railway creates a public URL like: `https://investracker-production.up.railway.app`

5. **COPY THIS URL** - you'll need it for Vercel!

6. Test it in browser:
   - Open: `https://YOUR-RAILWAY-URL/health`
   - You should see: `{"status": "healthy", "version": "1.0.0"}`

✅ **Backend is live!** 🎉

---

## Step 7: Run Database Migrations (4 minutes)

Now we need to create the database tables.

**Option A: Using Railway CLI (Recommended)**

1. Install Railway CLI:
   ```powershell
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```powershell
   railway login
   ```
   - Browser opens, click "Confirm"

3. Link to your project:
   ```powershell
   cd c:\Users\misha\OneDrive\Desktop\Investracker\backend
   railway link
   ```
   - Select your project from the list
   - Select your backend service

4. Run migrations:
   ```powershell
   railway run alembic upgrade head
   ```
   - You should see migrations applying
   - Look for "Running upgrade ... -> ..." messages

**Option B: Using Railway Dashboard (If CLI doesn't work)**

1. Click on your **backend service card**

2. Click **"Deployments"** tab

3. Find the latest successful deployment (green checkmark)

4. Click the **three dots** (...) menu

5. Click **"Run Command"**

6. Type: `alembic upgrade head`

7. Click "Run"

8. Watch the logs - migrations should apply

✅ **Database tables created!**

---

## Step 8: Verify Everything Works (2 minutes)

1. Click on your **backend service card**

2. Click **"Deployments"** tab

3. Click on the latest deployment (should be green ✓)

4. Click **"View Logs"**

5. Look for:
   ```
   INFO:     Application startup complete.
   INFO:     Uvicorn running on http://0.0.0.0:XXXX
   ```

6. Test the API in browser:
   - Open: `https://YOUR-RAILWAY-URL/docs`
   - You should see FastAPI Swagger documentation
   - Try the `/health` endpoint

✅ **Backend fully deployed and working!** 🚀

---

## 🎊 You Did It!

Your backend is now:
- ✅ Deployed to Railway
- ✅ Connected to PostgreSQL database
- ✅ Database tables created
- ✅ Publicly accessible with HTTPS
- ✅ Auto-deploys on git push to main

---

## 📝 Save These Details

Copy this info for the next step (Vercel):

```
Backend URL: https://YOUR-RAILWAY-URL
Health Check: https://YOUR-RAILWAY-URL/health
API Docs: https://YOUR-RAILWAY-URL/docs
```

---

## 🚀 Next Step: Deploy Frontend to Vercel

Since you've worked with Vercel before, this will be quick:

1. Go to vercel.com (you're probably logged in already)
2. Import `investracker` repo
3. Set Root Directory: `frontend`
4. Add env var: `NEXT_PUBLIC_API_URL` = Your Railway URL
5. Deploy!

Then come back and update Railway's `CORS_ORIGINS` to include your Vercel URL.

---

## 🆘 Common Issues

### "Build failed" in Railway
- Check logs: Click deployment → "View Logs"
- Make sure `requirements.txt` has all dependencies
- Verify Python version compatibility

### "Database connection failed"
- Railway should auto-set `DATABASE_URL`
- Check Variables tab - is `DATABASE_URL` there?
- Try redeploying: Settings → "Redeploy"

### "Can't run migrations"
- Make sure you're in `/backend` directory
- Check if Railway CLI is linked: `railway status`
- Try from dashboard: Deployments → Run Command

### "Health check failing"
- Make sure `/health` endpoint exists in `app/main.py`
- Check if service is running: View Logs
- Verify port binding to `$PORT` variable

---

## 💡 Pro Tips

1. **Watch the logs** while deploying - you'll learn a lot
2. **Railway auto-redeploys** on every push to main
3. **Use Railway CLI** for migrations and debugging
4. **Check Metrics tab** to see CPU/Memory usage
5. **Free $5 credits** renew every month

---

## 🎯 Ready?

Start with **Step 1** and work your way down. Each step builds on the previous one.

You've got this! 🔥

**Estimated total time: 20 minutes**

Let me know if you get stuck on any step!
