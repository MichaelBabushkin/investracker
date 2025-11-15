# 🎯 QUICK REFERENCE - Copy This!

## Your Generated SECRET_KEY
```
vt3SxFUVQubW7KsBjPzR4lreDkCg1EpO
```

## Environment Variables for Railway

Copy these exactly as shown:

### 1. SECRET_KEY
```
vt3SxFUVQubW7KsBjPzR4lreDkCg1EpO
```

### 2. CORS_ORIGINS
```
http://localhost:3000
```
(Update later to include Vercel URL)

### 3. UPLOAD_DIR
```
/tmp/uploads
```

---

## Railway Configuration

### Root Directory
```
backend
```

### Start Command
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Health Check Path
```
/health
```

---

## URLs to Test After Deployment

Replace `YOUR-RAILWAY-URL` with your actual URL:

### Health Check
```
https://YOUR-RAILWAY-URL/health
```
Should return: `{"status": "healthy", "version": "1.0.0"}`

### API Documentation
```
https://YOUR-RAILWAY-URL/docs
```
Should show: FastAPI Swagger UI

### API Endpoints
```
https://YOUR-RAILWAY-URL/api/v1/world-stocks/accounts
https://YOUR-RAILWAY-URL/api/v1/israeli-stocks/accounts
```

---

## Railway CLI Commands

### Install
```powershell
npm install -g @railway/cli
```

### Login
```powershell
railway login
```

### Link Project
```powershell
cd c:\Users\misha\OneDrive\Desktop\Investracker\backend
railway link
```

### Run Migrations
```powershell
railway run alembic upgrade head
```

### Check Status
```powershell
railway status
```

### View Logs
```powershell
railway logs
```

### Connect to Database
```powershell
railway run psql
```

---

## Troubleshooting Commands

### If build fails
```powershell
# Check Python version
railway run python --version

# Check if deps installed
railway run pip list

# Manual migration
railway run alembic upgrade head
```

### If can't connect to database
```powershell
# Check DATABASE_URL is set
railway variables

# Test database connection
railway run psql
```

---

## After Vercel Deployment

Update Railway CORS_ORIGINS to:
```
https://investracker.vercel.app,http://localhost:3000
```

---

## 🎊 Current Status

- ✅ Code pushed to GitHub: `main` branch
- ✅ SECRET_KEY generated
- ✅ Documentation ready
- ⏳ Railway deployment: Starting now!
- ⏳ Vercel deployment: After Railway

---

## 📋 Deployment Checklist

Railway:
- [ ] Account created
- [ ] Project created from GitHub
- [ ] Backend service configured
- [ ] PostgreSQL added
- [ ] Environment variables set
- [ ] Backend deployed successfully
- [ ] Migrations run
- [ ] Health check working
- [ ] API docs accessible

Vercel:
- [ ] Project imported
- [ ] Root directory set to `frontend`
- [ ] NEXT_PUBLIC_API_URL set
- [ ] Frontend deployed
- [ ] Can access app
- [ ] Backend connection working

Final:
- [ ] Update CORS_ORIGINS in Railway
- [ ] Test upload functionality
- [ ] Verify data persists
- [ ] Celebrate! 🎉

---

Ready to start? Open `RAILWAY_TODAY.md` and follow Step 1!
