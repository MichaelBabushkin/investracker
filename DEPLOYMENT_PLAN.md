# Investracker Deployment Plan

## 🎯 Deployment Strategy: Vercel + Railway (Monorepo)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│                     (Web Browser)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  VERCEL (Frontend)                           │
│  - Next.js Application (from /frontend)                      │
│  - Automatic deployments from main branch                    │
│  - Preview deployments for PRs                               │
│  - Free SSL, CDN, Edge Functions                            │
│  - FREE FOREVER                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ API Calls (HTTPS)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  RAILWAY (Backend)                           │
│  - FastAPI Application (from /backend)                       │
│  - Auto-deploy from main branch                             │
│  - Always-on (no cold starts)                               │
│  - Built-in cron jobs support                               │
│  - Pay-per-use: ~$5-15/month                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ PostgreSQL Connection
                     │
┌────────────────────▼────────────────────────────────────────┐
│             RAILWAY PostgreSQL                               │
│  - Managed PostgreSQL Database                              │
│  - Included in Railway pricing                              │
│  - Auto backups, metrics, logs                              │
└─────────────────────┴────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│             RAILWAY REDIS (Future)                           │
│  - For background queues (Celery/RQ)                        │
│  - Job queues for async tasks                               │
│  - Included in Railway pricing                              │
└─────────────────────────────────────────────────────────────┘
```

### Why Monorepo?

✅ Single source of truth
✅ Atomic commits (frontend + backend together)
✅ Shared TypeScript types
✅ Simpler deployment (one repo, two services)
✅ Railway and Vercel handle monorepos natively

## 🔄 Git Branching Strategy

### Branch Structure

```
main (production)
├── develop (staging)
└── feature/* (feature branches)
```

### Workflow

1. **Feature Development**: Create `feature/feature-name` from `develop`
2. **Testing**: Merge to `develop` for testing
3. **Production**: Merge `develop` to `main` for deployment

## 📦 Repository Setup

### 1. Environment Management

#### Local (.env.local)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/investracker_dev

# API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Auth (when we add it)
NEXTAUTH_SECRET=your-local-secret
NEXTAUTH_URL=http://localhost:3000
```

#### Staging (.env.staging)

```env
DATABASE_URL=postgresql://user:password@render-host/investracker_staging
NEXT_PUBLIC_API_URL=https://investracker-api-staging.onrender.com
NEXTAUTH_URL=https://investracker-staging.vercel.app
```

#### Production (.env.production)

```env
DATABASE_URL=postgresql://user:password@render-host/investracker_prod
NEXT_PUBLIC_API_URL=https://investracker-api.onrender.com
NEXTAUTH_URL=https://investracker.vercel.app
```

### 2. Remove Hardcoded Values

#### Backend Issues to Fix:

- [ ] User ID hardcoded in services
- [ ] Database credentials in code
- [ ] File upload paths hardcoded
- [ ] CORS origins hardcoded

#### Frontend Issues to Fix:

- [ ] API URL hardcoded
- [ ] No authentication
- [ ] No user context

## � Cost Breakdown

### Railway (Backend + Database + Redis)

**How Railway Pricing Works:**

- Pay only for what you use (no fixed plans for hobby projects)
- $5 free credits every month
- Billed per GB-hour of RAM and vCPU usage
- Typical costs for small apps: **$5-15/month**

**Expected Monthly Costs:**

#### Months 1-3 (Low Usage - You + Close Friends)

```
FastAPI Backend:
  - RAM: 512MB × 730 hours × $0.000231/GB-hour = ~$2.50

PostgreSQL:
  - RAM: 256MB × 730 hours × $0.000231/GB-hour = ~$1.25

Redis (when added):
  - RAM: 256MB × 730 hours × $0.000231/GB-hour = ~$1.25

Total: ~$5/month (COVERED BY FREE $5 CREDITS!)
```

#### Months 4-12 (Regular Usage)

```
FastAPI Backend: ~$3-5
PostgreSQL: ~$2-3
Redis: ~$1-2
Cron Jobs: ~$0.50

Total: ~$7-11/month
```

#### At Scale (Heavy Usage)

```
FastAPI Backend: ~$8-12
PostgreSQL: ~$5-8
Redis: ~$3-5
Cron Jobs: ~$1-2

Total: ~$17-27/month
```

### Vercel (Frontend)

- **FREE FOREVER** for personal projects
- Includes: Unlimited deployments, SSL, CDN, 100GB bandwidth/month

### Total Monthly Cost

| Usage Level     | Railway           | Vercel | **Total**        |
| --------------- | ----------------- | ------ | ---------------- |
| **Months 1-3**  | $0 (free credits) | $0     | **$0/month** ✨  |
| **Light usage** | $7-11             | $0     | **$7-11/month**  |
| **Heavy usage** | $17-27            | $0     | **$17-27/month** |

**Compared to Render:**

- Render: $7 (backend) + $7 (db) = **$14/month minimum**
- Railway: Pay only what you use, **~$7-11/month** average
- **Savings: ~$3-7/month** + better features!

### GitHub Actions Workflow

**.github/workflows/deploy-backend.yml**

- Run on push to `main` and `develop`
- Run tests
- Deploy to Render

**.github/workflows/deploy-frontend.yml**

- Run on push to `main` and `develop`
- Run build
- Deploy to Vercel (automatic)

**.github/workflows/tests.yml**

- Run on all PRs
- Backend: pytest
- Frontend: npm test
- Linting checks

## 📝 Migration Checklist

### Phase 1: Repository Setup (Week 1)

- [ ] Create GitHub repository
- [ ] Set up branch protection for `main`
- [ ] Add `.gitignore` for sensitive files
- [ ] Create `.env.example` templates
- [ ] Set up GitHub Actions secrets

### Phase 2: Backend Preparation (Week 1-2)

- [ ] Remove all hardcoded user IDs
- [ ] Add environment variable configuration
- [ ] Add authentication middleware
- [ ] Update database connection for production
- [ ] Add health check endpoint
- [ ] Create `requirements.txt` freeze
- [ ] Add Dockerfile (optional)
- [ ] Create `render.yaml` configuration

### Phase 3: Frontend Preparation (Week 2)

- [ ] Remove hardcoded API URLs
- [ ] Add environment variable handling
- [ ] Add authentication flow
- [ ] Add user context provider
- [ ] Update API client configuration
- [ ] Add loading states for cold starts
- [ ] Create `vercel.json` configuration

### Phase 4: Database Migration (Week 2-3)

- [ ] Export local database schema
- [ ] Create production database on Render
- [ ] Run migrations on production
- [ ] Set up database backups
- [ ] Test connection from Render backend

### Phase 5: Deployment (Week 3)

- [ ] Deploy backend to Render
- [ ] Configure environment variables
- [ ] Test API endpoints
- [ ] Deploy frontend to Vercel
- [ ] Configure API URL
- [ ] Test end-to-end flow
- [ ] Set up custom domain (optional)

### Phase 6: Monitoring & Optimization (Week 4)

- [ ] Add error tracking (Sentry - free tier)
- [ ] Add analytics (Vercel Analytics - free)
- [ ] Set up uptime monitoring (UptimeRobot - free)
- [ ] Configure log aggregation
- [ ] Add performance monitoring

## 💰 Cost Breakdown

### Free Tier (Current)

- **Vercel**: Free (100GB bandwidth, unlimited deployments)
- **Render Backend**: Free (750 hours/month, sleeps after 15min)
- **Render PostgreSQL**: Free for 90 days
- **GitHub**: Free (public/private repos)
- **Total**: $0/month

### After Free Tier (~3 months)

- **Vercel**: $0 (still free for hobby projects)
- **Render Backend**: $7/month (always-on)
- **Render PostgreSQL**: $7/month (persistent)
- **Total**: $14/month

### Growth Plan (~1 year)

- **Vercel Pro**: $20/month (better performance, analytics)
- **Render**: $25/month (more resources)
- **Database**: $15/month (larger database)
- **Total**: $60/month

## 🛡️ Security Considerations

### Secrets Management

1. **Never commit**:

   - `.env` files
   - Database credentials
   - API keys
   - Auth secrets

2. **Use**:
   - GitHub Secrets for CI/CD
   - Vercel Environment Variables
   - Render Environment Variables

### Authentication

- Add NextAuth.js for user authentication
- Implement JWT tokens
- Add role-based access control
- Secure API endpoints

## 📊 Monitoring

### Free Tools

- **Vercel Analytics**: Frontend performance
- **Render Metrics**: Backend health
- **Sentry**: Error tracking (free tier: 5k events/month)
- **UptimeRobot**: Uptime monitoring (free tier: 50 monitors)
- **LogRocket**: Session replay (free tier: 1k sessions/month)

## 🎯 Next Steps

### Immediate Actions

1. Create GitHub repository
2. Set up `.gitignore` and `.env.example`
3. Create branch structure
4. Remove hardcoded values
5. Set up Render account
6. Set up Vercel account

### This Week

1. Configure environment variables
2. Add authentication
3. Create CI/CD workflows
4. Deploy to staging

### Next Week

1. Test staging environment
2. Deploy to production
3. Set up monitoring
4. Document deployment process

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)
- [NextAuth.js](https://next-auth.js.org/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
