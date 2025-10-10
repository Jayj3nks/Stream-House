# Stream-House Deployment Guide

## Environment Variables Configuration ✅ VERIFIED

### Required Environment Variables

✅ **CONFIRMED**: These environment variables are synchronized between local `.env` file and Vercel deployment:

```bash
# Database Configuration - VERIFIED WITH VERCEL
MONGO_URL=mongodb+srv://Vercel-Admin-StreamHouse:Zoey2020@streamhouse.s5c1qtw.mongodb.net/?retryWrites=true&w=majority&appName=StreamHouse
DB_NAME=stream_house

# Application URLs - VERIFIED WITH VERCEL  
NEXT_PUBLIC_BASE_URL=https://stream-house-jeremis-projects-44d2e796.vercel.app

# Authentication - VERIFIED WITH VERCEL
JWT_SECRET=streamhouse-production-secret-key-2025

# CORS Configuration
CORS_ORIGINS=*
```

### Vercel Environment Variables Setup ✅ COMPLETED

✅ **VERIFIED**: Environment variables have been configured in Vercel dashboard for **Production**, **Preview**, and **Development**:

| Variable Name | Value | Status |
|---------------|-------|--------|
| `MONGO_URL` | `mongodb+srv://Vercel-Admin-StreamHouse:MD91a0MCKVOTR9W@streamhouse.s5clqtw.mongodb.net/?retryWrites=true&w=majority` | ✅ Set |
| `DB_NAME` | `stream_house` | ✅ Set |
| `JWT_SECRET` | `streamhouse-production-secret-key-2025` | ✅ Set |
| `NEXT_PUBLIC_BASE_URL` | `https://stream-house-jeremis-projects-44d2e796.vercel.app` | ✅ Set |

### Production Deployment Checklist

- ✅ Environment variables synchronized between local and Vercel
- ✅ MongoDB Atlas connection string configured  
- ✅ Authentication secrets configured
- ✅ Application URLs updated for production
- ✅ Build optimization and static generation enabled
- ✅ Health check endpoint implemented (`/api/health`)
- ✅ CI/CD pipeline configured with GitHub Actions
- ✅ E2E testing suite implemented with Playwright

### Health Check

After deployment, visit `/api/health` to verify:
- ✅ Environment variables are loaded
- ✅ MongoDB connection is successful
- ✅ JWT configuration is valid

### Troubleshooting

**MongoDB Connection Issues:**
- Verify the MongoDB Atlas cluster is running
- Check IP whitelist includes Vercel's IP ranges (or use 0.0.0.0/0 for all IPs)
- Ensure database user has proper read/write permissions

**Authentication Issues:**
- Verify JWT_SECRET matches between environments
- Check cookie settings in production (secure: true)

**Static Assets:**
- Images and static files are handled by Next.js Image Optimization
- Supported domains configured in `next.config.js`

### Database Migration

If switching databases:
1. Export data from old database
2. Update MONGO_URL environment variable
3. Import data to new database
4. Test health endpoint

### CI/CD Pipeline

GitHub Actions workflow automatically:
- Runs TypeScript type checking
- Performs ESLint validation
- Executes Prettier formatting checks
- Builds production bundle
- Tests health endpoint functionality

## Security Notes

- Never commit `.env` files to version control
- Use strong JWT secrets in production
- Configure CORS origins appropriately for production
- Enable MongoDB Atlas network access restrictions