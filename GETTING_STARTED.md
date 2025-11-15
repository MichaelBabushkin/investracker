# Getting Started with Investracker Deployment

## 🎯 Architecture Overview

**Monorepo Structure:**
```
investracker/
├── frontend/          → Deployed to Vercel (FREE)
├── backend/           → Deployed to Railway ($5-15/month)
├── railway.toml       → Railway config
├── vercel.json        → Vercel config
└── .github/workflows/ → CI/CD pipelines
```

**Why Monorepo?**
- ✅ Single source of truth
- ✅ Deploy frontend + backend changes together
- ✅ Share TypeScript types between frontend/backend
- ✅ One repo to manage, simpler PRs
- ✅ Both Railway and Vercel support monorepos natively

## Quick Start Checklist

### ✅ Phase 1: Repository Setup (Today)

1. **Initialize Git Repository**
   ```bash
   cd c:\Users\misha\OneDrive\Desktop\Investracker
   git init
   git add .
   git commit -m "Initial commit: Basic app with Israeli and World stocks tracking"
   ```

2. **Create GitHub Repository**
   - Go to https://github.com/new
   - Name: `investracker`
   - Description: "Personal stock portfolio tracker with PDF statement parsing"
   - Make it Private (for now)
   - Don't initialize with README (we have one)
   - Click "Create repository"

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/MichaelBabushkin/investracker.git
   git branch -M main
   git push -u origin main
   ```

4. **Create develop branch**
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

5. **Set up branch protection**
   - Go to repository Settings → Branches
   - Add rule for `main`:
     - ✅ Require pull request reviews before merging
     - ✅ Require status checks to pass before merging
     - ✅ Require branches to be up to date before merging

### ✅ Phase 2: Remove Hardcoded Values (This Weekend)

#### Backend Changes Needed:

1. **app/services/israeli_stock_service.py**
   - Replace: `user_id = "user_123"` with `user_id` from auth
   
2. **app/services/world_stock_service.py**
   - Replace: `user_id = "user_e31e99619f4c1930"` with `user_id` from auth

3. **app/core/config.py** (create new file)
   ```python
   from pydantic_settings import BaseSettings

   class Settings(BaseSettings):
       DATABASE_URL: str
       SECRET_KEY: str
       CORS_ORIGINS: list[str]
       UPLOAD_DIR: str = "./uploads"
       
       class Config:
           env_file = ".env"
   
   settings = Settings()
   ```

4. **app/main.py**
   - Update CORS to use `settings.CORS_ORIGINS`
   - Add `/health` endpoint

#### Frontend Changes Needed:

1. **Create env config file**
   ```typescript
   // frontend/src/config/env.ts
   export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
   ```

2. **Update API client**
   - Use `API_URL` instead of hardcoded `localhost:8000`

### ✅ Phase 3: Set Up Hosting (Next Week)

#### 1. Railway Account Setup (Backend + Database)

**Step 1: Create Railway Account**
1. Go to https://railway.app
2. Click "Login" → Sign in with GitHub
3. Authorize Railway to access your repos

**Step 2: Create New Project**
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `investracker` repository
4. Railway will detect it's a monorepo

**Step 3: Configure Backend Service**
1. Railway creates a service automatically
2. Click on the service → "Settings"
3. Set **Root Directory**: `backend`
4. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Click "Save"

**Step 4: Add PostgreSQL Database**
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway automatically creates the database
3. Copy the `DATABASE_URL` (it's auto-set as env var)

**Step 5: Set Environment Variables**
1. Click on backend service → "Variables"
2. Add these variables:
   ```
   DATABASE_URL → (auto-set by Railway)
   SECRET_KEY → (generate random string)
   CORS_ORIGINS → https://investracker.vercel.app
   UPLOAD_DIR → /tmp/uploads
   ```

**Step 6: Deploy!**
1. Railway automatically deploys on push to `main`
2. Wait 2-3 minutes for first deployment
3. Click "Settings" → Copy your backend URL
4. Example: `https://investracker-production.up.railway.app`

**Step 7: Run Database Migrations**
1. In Railway dashboard, click backend service
2. Click "Deployments" → Latest deployment → "View Logs"
3. Or run migrations via Railway CLI:
   ```powershell
   railway run alembic upgrade head
   ```

#### 2. Vercel Account Setup (Frontend)
1. Sign up at https://vercel.com (use GitHub login)
2. Click "Add New..." → "Project"
3. Import `investracker` repo
4. Configure:
   - Framework: **Next.js**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Environment Variables:
     - `NEXT_PUBLIC_API_URL`: `https://investracker-production.up.railway.app`
5. Click "Deploy"
6. Wait 2-3 minutes
7. Your app will be at: `https://investracker.vercel.app`

#### 3. Future: Add Redis for Queues (Optional)
1. In Railway project, click "New" → "Database" → "Add Redis"
2. Railway auto-connects it to your backend
3. Use for background jobs with Celery or RQ

#### 4. Future: Add Cron Jobs (Optional)
1. In Railway, click on backend service
2. Go to "Cron" tab
3. Add cron jobs:
   ```
   Daily portfolio update: 0 0 * * *
   Fetch prices: */15 9-16 * * 1-5
   Weekly report: 0 22 * * 0
   ```

### ✅ Phase 4: Testing (Next Week)

1. Test staging deployment
2. Fix any issues
3. Merge to main
4. Test production deployment

## 📊 Expected Timeline

- **Week 1**: Repository setup, remove hardcoded values
- **Week 2**: Deploy to staging, test thoroughly
- **Week 3**: Deploy to production, monitor
- **Week 4**: Add authentication, monitoring, analytics

## 💰 Cost Summary

**Railway (Backend + PostgreSQL + Redis):**

| Usage Level | Monthly Cost | What You Get |
|-------------|--------------|--------------|
| **Months 1-3** | **$0** | Covered by $5 free credits |
| **Light usage** | **$7-11** | Backend + DB always-on |
| **Heavy usage** | **$17-27** | Backend + DB + Redis + Crons |

**Vercel (Frontend):**
- **$0/month FOREVER** for personal projects
- Includes: SSL, CDN, 100GB bandwidth

**Total Cost:**
- **First 3 months: $0**
- **Ongoing: $7-11/month average**
- **At scale: $17-27/month max**

**Why Railway beats Render:**
- ✅ Cheaper (pay-per-use vs fixed $14/month)
- ✅ Built-in cron jobs (no extra service needed)
- ✅ Redis included (for queues)
- ✅ No cold starts (always-on)
- ✅ Better monorepo support

---

## 🚨 Important Notes

1. **Railway free credits**:
   - $5/month free credits for personal projects
   - Covers basic usage for small apps
   - No credit card required to start

2. **Monorepo advantages**:
   - Railway deploys from `/backend` directory
   - Vercel deploys from `/frontend` directory
   - Both watch the same GitHub repo
   - Deploy together or separately

3. **Database management**:
   - Railway PostgreSQL has automatic backups
   - Access via Railway dashboard
   - Or use Railway CLI: `railway run psql`

4. **Cron jobs**:
   - Add later through Railway dashboard
   - No code changes needed
   - Run Python scripts on schedule

## 🔐 Security Checklist

Before deploying:
- [ ] No hardcoded passwords in code
- [ ] All `.env` files in `.gitignore`
- [ ] Secrets stored in Render/Vercel env vars
- [ ] CORS configured for production domains only
- [ ] Database has strong password
- [ ] API has rate limiting (add later)

## 📞 Need Help?

Common issues:
- **Build fails**: Check logs in Render/Vercel dashboard
- **Database connection fails**: Check DATABASE_URL env var
- **CORS errors**: Update CORS_ORIGINS in backend
- **Frontend can't reach backend**: Check NEXT_PUBLIC_API_URL

## Next Steps After Deployment

1. Add user authentication (NextAuth.js)
2. Add error tracking (Sentry)
3. Add analytics (Vercel Analytics)
4. Add monitoring (UptimeRobot)
5. Optimize performance
6. Add tests
7. Set up automated backups

---

Ready to start? Begin with Phase 1! 🚀
