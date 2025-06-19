# 🚀 Pentriarch AI - Deployment Guide

[![Deploy Status](https://github.com/username/pentriarch-ai/workflows/🚀%20Pentriarch%20AI%20-%20CI/CD%20Pipeline/badge.svg)](https://github.com/username/pentriarch-ai/actions)
[![Vercel Deployment](https://vercel-badge.vercel.app/api/username/pentriarch-ai)](https://pentriarch-ai.vercel.app)

This guide covers the complete deployment setup for Pentriarch AI, including CI/CD pipeline configuration and manual deployment procedures.

## 📋 Table of Contents

- [🏗️ Initial Setup](#-initial-setup)
- [🔐 Environment Variables](#-environment-variables)
- [🚀 Automated Deployments](#-automated-deployments)
- [🚨 Manual Deployments](#-manual-deployments)
- [🔧 Troubleshooting](#-troubleshooting)

## 🏗️ Initial Setup

### 1. Vercel Project Setup

1. **Create Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Install Vercel CLI**:
   ```bash
   bun add -g vercel@latest
   ```
3. **Login to Vercel**:
   ```bash
   vercel login
   ```
4. **Link Project**:
   ```bash
   cd pentriarch-ai
   vercel link
   ```

### 2. GitHub Repository Setup

1. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/yourusername/pentriarch-ai.git
   git push -u origin main
   ```

2. **Configure GitHub Secrets**:
   Go to `Settings > Secrets and Variables > Actions` and add:

   ```
   VERCEL_TOKEN=your_vercel_token
   VERCEL_ORG_ID=your_org_id
   VERCEL_PROJECT_ID=your_project_id
   ```

### 3. Getting Vercel IDs

Run these commands in your project directory:

```bash
# Get Vercel token from dashboard: https://vercel.com/account/tokens
vercel whoami  # Shows your org info

# Get project ID
vercel env ls  # Shows project details
```

## 🔐 Environment Variables

### Required Variables (Set in Vercel Dashboard)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIs...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `DEEPSEEK_API_KEY` | DeepSeek API key | `sk-...` |
| `JWT_SECRET` | JWT signing secret | Random 64-char string |
| `ENCRYPTION_KEY` | Data encryption key | Random 32-char string |

### Setting Environment Variables

**In Vercel Dashboard:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all required variables for `Production`, `Preview`, and `Development`

**Using Vercel CLI:**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
# ... repeat for all variables
```

## 🚀 Automated Deployments

### CI/CD Pipeline Features

Our GitHub Actions pipeline automatically:

#### 🔍 **Quality Assurance**
- ✅ Type checking with TypeScript
- ✅ Code linting with Biome
- ✅ Build verification
- ✅ Bundle size analysis

#### 🛡️ **Security Scanning**
- ✅ Dependency vulnerability checks
- ✅ Security headers verification
- ✅ Authentication system validation

#### 🚀 **Automated Deployments**
- **Preview Deployments**: Every pull request gets a preview URL
- **Production Deployments**: Automatic deployment on `main` branch merges
- **Post-deployment Verification**: Health checks and performance validation

### Deployment Triggers

| Event | Action | Environment |
|-------|--------|-------------|
| Push to `main` | 🌟 Production deployment | Production |
| Pull Request | 🚀 Preview deployment | Preview |
| Manual trigger | 🚨 Custom deployment | Configurable |

### Branch Strategy

```
main            ←── Production deployments
  ↑
develop         ←── Development and testing
  ↑
feature/*       ←── Feature branches (preview deployments)
```

## 🚨 Manual Deployments

### Emergency Deployment

For critical hotfixes, use the manual deployment workflow:

1. **Go to GitHub Actions**
2. **Select "🚨 Manual Deployment & Hotfix"**
3. **Click "Run workflow"**
4. **Configure options:**
   - **Environment**: `preview` or `production`
   - **Reason**: Describe the deployment purpose
   - **Skip tests**: Only for emergencies

### Local Deployment Testing

```bash
# Install dependencies
bun install

# Build locally
bun run build

# Test with Vercel CLI
vercel dev

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 🔧 Troubleshooting

### Common Issues

#### ❌ Build Failures

**Problem**: TypeScript or ESLint errors during deployment
```bash
# Solution: Run locally first
bun run build
bun run lint
```

**Problem**: Missing environment variables
```bash
# Solution: Verify all required vars are set
vercel env ls
```

#### ❌ Deployment Failures

**Problem**: Vercel authentication issues
```bash
# Solution: Re-authenticate
vercel logout
vercel login
```

**Problem**: Project linking issues
```bash
# Solution: Re-link project
vercel unlink
vercel link
```

### Build Optimization

#### Performance Tips

1. **Bundle Analysis**:
   ```bash
   # Analyze bundle size
   bunx @next/bundle-analyzer
   ```

2. **Environment-specific builds**:
   ```bash
   # Development build
   NODE_ENV=development bun run build

   # Production build
   NODE_ENV=production bun run build
   ```

3. **Cache optimization**:
   - Vercel automatically caches dependencies
   - Next.js caches build artifacts
   - CDN caching for static assets

## 📊 Monitoring and Analytics

### Deployment Status

- **GitHub Actions**: Real-time build status
- **Vercel Dashboard**: Deployment logs and metrics
- **Health Checks**: Automated post-deployment verification

### Performance Monitoring

- **Core Web Vitals**: Automatic tracking in Vercel
- **Error Tracking**: Built-in error boundaries
- **Usage Analytics**: Integrated performance monitoring

### Alerts and Notifications

- **Build Failures**: GitHub notifications
- **Deployment Success**: Automatic PR comments
- **Health Check Failures**: Immediate alerts

## 🎯 Best Practices

### Development Workflow

1. **Feature Development**:
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git push origin feature/new-feature
   # Create PR → automatic preview deployment
   ```

2. **Code Review**:
   - ✅ Review preview deployment
   - ✅ Check CI/CD status
   - ✅ Verify functionality

3. **Production Release**:
   ```bash
   git checkout main
   git merge feature/new-feature
   git push origin main
   # → Automatic production deployment
   ```

### Security Considerations

- **Environment Variables**: Never commit secrets to git
- **Access Control**: Use GitHub branch protection rules
- **Deployment Approval**: Require reviews for production
- **Security Headers**: Configured in `vercel.json`

## 🆘 Support

### Getting Help

- **GitHub Issues**: Create issue for deployment problems
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Documentation**: [vercel.com/docs](https://vercel.com/docs)

### Quick Commands Reference

```bash
# Deployment commands
vercel                    # Deploy to preview
vercel --prod            # Deploy to production
vercel logs              # View deployment logs
vercel env ls            # List environment variables

# Development commands
bun run dev              # Start development server
bun run build           # Build for production
bun run lint            # Run code linting
bun run format          # Format code

# GitHub Actions
git push origin main     # Trigger production deployment
git push origin develop  # Trigger development deployment
```

---

## 🎉 Deployment Complete!

Once configured, your Pentriarch AI application will have:

- ✅ **Automated CI/CD pipeline**
- ✅ **Preview deployments for every PR**
- ✅ **Production deployments on main merges**
- ✅ **Security scanning and quality checks**
- ✅ **Performance monitoring and health checks**
- ✅ **Manual deployment capabilities for emergencies**

Your application is now enterprise-ready with professional deployment workflows! 🚀
