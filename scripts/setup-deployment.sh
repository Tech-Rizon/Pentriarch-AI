#!/bin/bash

# 🚀 Pentriarch AI - Deployment Setup Script
# This script helps you set up the deployment environment quickly

set -e

echo "🚀 Pentriarch AI - Deployment Setup"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_requirements() {
    echo "🔍 Checking requirements..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
        exit 1
    fi

    # Check Bun
    if ! command -v bun &> /dev/null; then
        echo -e "${YELLOW}⚠️  Bun is not installed. Installing Bun...${NC}"
        curl -fsSL https://bun.sh/install | bash
        export PATH="$HOME/.bun/bin:$PATH"
    fi

    # Check Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git is not installed. Please install Git${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ All requirements satisfied${NC}"
    echo ""
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    bun install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
}

# Setup Vercel
setup_vercel() {
    echo "🔧 Setting up Vercel..."

    if ! command -v vercel &> /dev/null; then
        echo "Installing Vercel CLI..."
        bun add -g vercel@latest
    fi

    echo ""
    echo -e "${BLUE}Please follow these steps to complete Vercel setup:${NC}"
    echo "1. Run: vercel login"
    echo "2. Run: vercel link"
    echo "3. Set up environment variables in Vercel dashboard"
    echo ""
}

# Create .env.local template
create_env_template() {
    echo "📝 Creating .env.local template..."

    if [ ! -f .env.local ]; then
        cat > .env.local << 'EOF'
# 🔐 Pentriarch AI - Environment Variables Template
# Copy this file and fill in your actual values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# AI Model API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Optional - Docker (if available)
DOCKER_HOST=unix:///var/run/docker.sock
KALI_CONTAINER_IMAGE=kalilinux/kali-rolling

# Optional - Application Settings
NEXT_PUBLIC_APP_NAME=Pentriarch AI
NEXT_PUBLIC_APP_VERSION=1.0.0
LOG_LEVEL=info
EOF
        echo -e "${GREEN}✅ .env.local template created${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
    fi
    echo ""
}

# Test build
test_build() {
    echo "🏗️ Testing build..."
    if bun run build; then
        echo -e "${GREEN}✅ Build successful${NC}"
    else
        echo -e "${RED}❌ Build failed. Please check the logs above${NC}"
        exit 1
    fi
    echo ""
}

# Setup GitHub
setup_github() {
    echo "📚 GitHub setup instructions:"
    echo ""
    echo -e "${BLUE}To complete GitHub Actions setup:${NC}"
    echo "1. Push your code to GitHub:"
    echo "   git remote add origin https://github.com/yourusername/pentriarch-ai.git"
    echo "   git push -u origin main"
    echo ""
    echo "2. Add these secrets to your GitHub repository:"
    echo "   - Go to Settings > Secrets and Variables > Actions"
    echo "   - Add VERCEL_TOKEN (get from https://vercel.com/account/tokens)"
    echo "   - Add VERCEL_ORG_ID (run: vercel whoami)"
    echo "   - Add VERCEL_PROJECT_ID (run: vercel env ls)"
    echo ""
}

# Main execution
main() {
    echo -e "${GREEN}Starting Pentriarch AI deployment setup...${NC}"
    echo ""

    check_requirements
    install_dependencies
    create_env_template
    test_build
    setup_vercel
    setup_github

    echo "🎉 Setup complete!"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "1. Fill in your .env.local file with actual values"
    echo "2. Complete Vercel setup (vercel login && vercel link)"
    echo "3. Set up GitHub repository and secrets"
    echo "4. Push to GitHub to trigger your first deployment!"
    echo ""
    echo -e "${BLUE}For detailed instructions, see: DEPLOYMENT.md${NC}"
    echo ""
    echo "🚀 Happy deploying!"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Pentriarch AI Deployment Setup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --skip-build   Skip the build test"
        echo ""
        exit 0
        ;;
    --skip-build)
        SKIP_BUILD=true
        ;;
esac

# Run main function
main
