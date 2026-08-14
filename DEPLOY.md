# PoC — Proof of Consent
## Deployment Guide

### Prerequisites
- Node.js 18+
- Python 3.10+
- Vercel account (free tier works)
- Supabase account (free tier works)
- Gmail with App Password (for emails)

---

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → Create project
2. Go to **SQL Editor** → Run this SQL:

```sql
-- Create signed_consents table
CREATE TABLE IF NOT EXISTS signed_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consent_id TEXT UNIQUE NOT NULL,
    doctor_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    procedure TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pdf_url TEXT,
    pdf_path TEXT,
    status TEXT DEFAULT 'signed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('consent-pdfs', 'consent-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'consent-pdfs');
CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'consent-pdfs');
```

3. Go to **Settings → API** → Copy:
   - Project URL
   - Publishable key (anon)

---

## Step 2: Set Up Gmail for Emails

1. Go to Google Account → Security → 2-Step Verification → Enable
2. Go to Google Account → Security → App passwords → Generate
3. Copy the 16-character app password

---

## Step 3: Deploy to Vercel

### Option A: Git-based deploy (recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Git Repository
3. Select your repository
4. Add environment variables:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase Publishable Key |
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | your_email@gmail.com |
| `SMTP_PASS` | your_16_char_app_password |
| `GROQ_API_KEY` | Your Groq API key |
| `GEMINI_API_KEY` | Your Gemini API key |
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `YOUTUBE_API_KEY` | Your YouTube API key |
| `RPC_URL` | https://sepolia.base.org |
| `CONTRACT_ADDRESS` | 0x764bF8b277a2c08B7A5B309Bb6853c5576C6f168 |
| `DEPLOYER_PRIVATE_KEY` | Your wallet private key |

5. Click **Deploy**

### Option B: CLI deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
# ... etc

# Deploy to production
vercel --prod
```

---

## Step 4: Update Frontend URLs

After deployment, update these files with your Vercel URL:

1. `frontend/patient_dashboard/patient.html` → `CONFIG.API_BASE_URL`
2. `frontend/doctor/dashboard.html` → `CONFIG.API_BASE_URL`
3. `backend/.env` → `FRONTEND_URL`

---

## Step 5: Configure Custom Domain (Optional)

1. Go to Vercel → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VERCEL                                  │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Static)     │  Backend (Serverless)              │
│  ├── patient.html      │  ├── Express.js                    │
│  ├── consent_sign.html │  ├── API Routes                    │
│  ├── dashboard.html    │  ├── AI Service                    │
│  └── config.js         │  ├── Blockchain Service            │
│                        │  ├── Email Service                 │
│                        │  ├── Translation Service            │
│                        │  └── PDF Generation                 │
└─────────────────────────────────────────────────────────────┘
         │                        │
         │                        ▼
         │              ┌─────────────────────┐
         │              │     SUPABASE        │
         │              │  ├── Database       │
         │              │  └── Storage (PDFs) │
         │              └─────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
├─────────────────────────────────────────────────────────────┤
│  ├── OpenRouter (AI)    ├── Google Translate                │
│  ├── Groq (LLM)         ├── YouTube API                    │
│  ├── Gemini (LLM)       ├── Openverse (Images)             │
│  ├── Gmail SMTP (Email) ├── Wikimedia (Images)             │
│  └── Base Sepolia (Blockchain)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Local Development

```bash
# Install dependencies
npm install
cd backend && npm install
cd ../agentservice && pip install -r requirements.txt

# Start services
./start.sh

# Access
Frontend: http://localhost:5502
Backend: http://localhost:4000
Agent: http://localhost:8000
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase publishable key |
| `SMTP_HOST` | Yes | Email server (smtp.gmail.com) |
| `SMTP_PORT` | Yes | Email port (587) |
| `SMTP_USER` | Yes | Email address |
| `SMTP_PASS` | Yes | App password |
| `GROQ_API_KEY` | Yes | Groq API key |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `YOUTUBE_API_KEY` | Yes | YouTube Data API key |
| `RPC_URL` | Yes | Base Sepolia RPC |
| `CONTRACT_ADDRESS` | Yes | Smart contract address |
| `DEPLOYER_PRIVATE_KEY` | Yes | Wallet private key |
| `AGENT_SERVICE_URL` | No | Agent service URL (for local dev) |
