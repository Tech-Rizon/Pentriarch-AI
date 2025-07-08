# 🛡️ Pentriarch AI – Advanced Penetration Testing Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-org/pentriarch-ai/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black?logo=next.js)](https://nextjs.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-blue?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.50.0-3ECF8E?logo=supabase)](https://supabase.com)
[![pnpm](https://img.shields.io/badge/Package_Manager-pnpm-yellow?logo=pnpm)](https://pnpm.io)

---

## ✨ Overview

**Pentriarch AI** is a modern AI-powered penetration testing platform that automates security scans, report generation, and AI-assisted threat analysis. Built using **Next.js 15**, **Tailwind CSS**, and **Supabase**, it delivers a secure, dynamic dashboard experience for security teams and DevSecOps engineers.

---

## ⚙️ Tech Stack

- ✅ **Next.js 15** App Router
- ✅ **Supabase** (Auth, Storage, Realtime)
- ✅ **Tailwind CSS** + `shadcn/ui` components
- ✅ **Zod** for schema validation
- ✅ **Dockerode** for containerised tool execution
- ✅ **Anthropic** / **OpenAI** / **DeepSeek** API integration

---

## 🚀 Getting Started

```bash
pnpm install      # install deps (or use bun)
pnpm dev          # start dev server
pnpm build        # build for production
pnpm start        # start production server

# then visit:
http://localhost:3000
```

---

## 📂 Project Structure

```bash
├── app/                # Next.js App Router (auth, dashboard, pages)
├── components/         # UI components (shadcn/ui-based)
├── lib/                # Supabase client, utils, types
├── styles/             # Tailwind and global styles
├── public/             # Static assets
├── api/                # Edge functions / route handlers
├── .env                # Environment config
├── netlify.toml        # Deployment config
└── README.md
```

---

## 🌐 Environment Setup

Create a `.env` file in the root or configure environment variables via Netlify’s dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
DEEPSEEK_API_KEY=your-deepseek-key
```

---

## 📦 Deploying on Netlify

This project is Netlify-ready!  
Make sure to:

1. Connect your GitHub repo in Netlify
2. Set the correct build command:

   ```bash
   pnpm install --no-frozen-lockfile && pnpm build
   ```

3. Add all required environment variables
4. Optionally add a `netlify.toml` file with:

```toml
[build]
  command = "pnpm install --no-frozen-lockfile && pnpm build"
  publish = ".next"
  environment = { NODE_VERSION = "18.20.8" }

[functions]
  node_bundler = "esbuild"
```

---

## ✅ Sample Test Case

You can test your scan API route with:

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{ "target": "http://example.com" }'
```

---

## 🔒 Security Tiers

| Plan       | Features                                                                 |
|------------|--------------------------------------------------------------------------|
| **PentRizon** (Free) | GPT-4 Mini & Claude Haiku, 5 scans/day, basic tools             |
| **Pentriarch** (Pro) | GPT-4, Claude Sonnet, DeepSeek V2, unlimited scans, priority AI |
| **Custom** (Enterprise) | Dedicated infra, custom AI training, white-label support       |

---

## 👨🏾‍💻 Author

Built by **Collin Ambani Anjeo**  
_Cybersecurity Architect | AI Builder | Founder @ TechRizon_

> "Security isn’t just a feature — it’s the foundation."

---

## 📄 License

MIT License  
© 2025 [TechRizon](https://tech-rizon.com). Built with ❤️ for cybersecurity automation.
