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

- ✅ Next.js 15 App Router
- ✅ Supabase (Auth, Storage, Realtime)
- ✅ Tailwind CSS + shadcn/ui components
- ✅ Zod for validation
- ✅ Dockerode for containerised analysis
- ✅ Anthropic/OpenAI integrations

---

## 🚀 Getting Started

```bash
pnpm install      # or bun install
pnpm dev          # local dev server
pnpm build        # production build
pnpm start        # run production
Visit http://localhost:3000 to get started

📂 Project Structure
bash
Copy
Edit
├── app/                # App router pages (auth, dashboard)
├── components/         # UI components (shadcn based)
├── lib/                # Supabase, utils, types
├── styles/             # Tailwind and global styles
├── public/             # Static assets
├── api/                # Edge/serverless functions
├── .env                # Environment variables
├── netlify.toml        # Deployment config
└── README.md
🌐 Environment Setup
Create a .env file or use Netlify dashboard to add the following:

env
Copy
Edit
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
DEEPSEEK_API_KEY=your-deepseek-key
🧪 Sample API Test Case (/api/scan)
Use supertest or Postman:

ts
Copy
Edit
import request from 'supertest'
import handler from '@/app/api/scan/route'

describe('POST /api/scan', () => {
  it('should return 200 with a valid payload', async () => {
    const res = await request(handler).post('/api/scan').send({
      url: 'https://example.com',
      strategy: 'ai',
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('scanId')
  })
})
📦 Deploy on Netlify
This project is pre-configured with [netlify.toml] for seamless deployment:

Push to GitHub

Connect repo to Netlify

Set env variables in Site Settings > Environment

📘 Learn More
Next.js Docs

shadcn/ui Components

Supabase

Dockerode

📄 License
MIT License. © 2025 Collin Ambani Anjeo