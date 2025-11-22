# 🚀 Deploy Frontend to Vercel

## Step-by-Step Deployment Guide

### 📋 Prerequisites

- ✅ Backend deployed on Railway: `https://investracker-production.up.railway.app`
- ✅ GitHub repository: `MichaelBabushkin/investracker`
- ✅ Vercel account (sign up at vercel.com with GitHub)

---

## 🎯 Step 1: Deploy to Vercel

### 1.1 Go to Vercel

1. Visit [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### 1.2 Import Repository

1. Click **"Add New..."** → **"Project"**
2. Find `investracker` in your repository list
3. Click **"Import"**

### 1.3 Configure Project Settings

**IMPORTANT: Configure these settings BEFORE deploying!**

#### Root Directory

- **Framework Preset**: Next.js
- **Root Directory**: `frontend` ⚠️ CRITICAL!
- **Build Command**: Leave as default (`npm run build`)
- **Output Directory**: Leave as default (`.next`)
- **Install Command**: Leave as default (`npm install`)

#### Environment Variables

Click **"Environment Variables"** and add:

| Name                  | Value                                                   | Environments                     |
| --------------------- | ------------------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://investracker-production.up.railway.app/api/v1` | Production, Preview, Development |

**Note**: Make sure to include `/api/v1` at the end of the Railway URL!

### 1.4 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. Vercel will show you the deployment URL (e.g., `https://investracker.vercel.app`)

---

## 🔧 Step 2: Update Railway CORS Settings

Your backend needs to allow requests from your Vercel frontend.

### 2.1 Get Your Vercel URL

After deployment, Vercel will give you a URL like:

- Production: `https://investracker.vercel.app`
- Preview: `https://investracker-git-main-yourusername.vercel.app`

### 2.2 Add to Railway Environment Variables

1. Go to [Railway Dashboard](https://railway.app)
2. Open your `investracker` project
3. Click on the **backend service**
4. Go to **"Variables"** tab
5. Find or add `CORS_ORIGINS` variable

**Set the value to:**

```
http://localhost:3000,https://investracker.vercel.app,https://investracker-*.vercel.app
```

This allows:

- Local development (`http://localhost:3000`)
- Production deployment (`https://investracker.vercel.app`)
- All preview deployments (`https://investracker-*.vercel.app`)

6. Click **"Save"** - Railway will automatically redeploy

---

## ✅ Step 3: Verify Deployment

### 3.1 Check Frontend

1. Visit your Vercel URL (e.g., `https://investracker.vercel.app`)
2. You should see the Investracker login/home page
3. Open browser DevTools (F12) → Console
4. Check for any errors

### 3.2 Test API Connection

1. Try to perform an action that requires the API (e.g., view portfolio)
2. Check Network tab in DevTools
3. Look for requests to `https://investracker-production.up.railway.app/api/v1/...`
4. Verify responses are successful (200 status codes)

### 3.3 Common Issues

#### Issue: "CORS Error" in Console

**Solution**: Make sure you added the Vercel URL to `CORS_ORIGINS` in Railway (Step 2.2)

#### Issue: "API_URL is undefined"

**Solution**: Check that `NEXT_PUBLIC_API_URL` is set in Vercel environment variables

#### Issue: "404 Not Found" for API calls

**Solution**: Verify the API URL includes `/api/v1` at the end

---

## 🎨 Step 4: Custom Domain (Optional)

### 4.1 Add Domain in Vercel

1. In Vercel project settings, go to **"Domains"**
2. Click **"Add"**
3. Enter your domain (e.g., `investracker.com`)
4. Follow Vercel's DNS instructions

### 4.2 Update Railway CORS

Add your custom domain to `CORS_ORIGINS`:

```
http://localhost:3000,https://investracker.vercel.app,https://investracker-*.vercel.app,https://investracker.com,https://www.investracker.com
```

---

## 🔄 Step 5: Auto-Deploy Setup

### 5.1 Vercel Auto-Deploy (Already Configured!)

- Every push to `main` branch → Deploys to production
- Every PR → Creates preview deployment
- No additional configuration needed!

### 5.2 Preview Deployments

- Each PR gets a unique URL for testing
- Automatically updated on new commits
- Perfect for code review

---

## 📊 Deployment Status

After following these steps, you'll have:

| Service  | Platform           | URL                                              | Status       |
| -------- | ------------------ | ------------------------------------------------ | ------------ |
| Frontend | Vercel             | `https://investracker.vercel.app`                | ✅ Live      |
| Backend  | Railway            | `https://investracker-production.up.railway.app` | ✅ Live      |
| Database | Railway PostgreSQL | Internal                                         | ✅ Connected |

---

## 🎯 Next Steps

After successful deployment:

1. **Run Database Migrations**

   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Link to your project
   railway link

   # Run migrations
   railway run alembic upgrade head
   ```

2. **Add Authentication**

   - Implement NextAuth.js
   - Remove hardcoded user IDs
   - Add proper user sessions

3. **Monitor & Optimize**
   - Check Vercel Analytics
   - Monitor Railway metrics
   - Optimize API calls if needed

---

## 💰 Cost Breakdown

| Service            | Tier        | Cost                                                 |
| ------------------ | ----------- | ---------------------------------------------------- |
| Vercel Frontend    | Hobby       | **FREE** (Forever)                                   |
| Railway Backend    | Pay-per-use | $0 for 3 months (trial credits)<br>$7-11/month after |
| Railway PostgreSQL | Included    | $0 (included in Railway)                             |
| **Total**          |             | **$0-11/month**                                      |

Compare to alternatives:

- Render: $14/month minimum (after 90 days free)
- Heroku: $7-25/month
- Digital Ocean: $12-24/month

---

## 🆘 Need Help?

### Vercel Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

### Railway Support

- [Railway Documentation](https://docs.railway.app)
- [CORS Configuration](https://fastapi.tiangolo.com/tutorial/cors/)

### Repository

- GitHub: [MichaelBabushkin/investracker](https://github.com/MichaelBabushkin/investracker)

---

**Ready to deploy? Start with Step 1! 🚀**
