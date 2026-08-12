<div align="center">

# 🏥 PoC — Proof of Consent

### *Understand Before You Consent.*

**AI-explained medical consent, backed by a blockchain proof-of-record.**

Turning dense, unreadable consent forms into clear explanations patients actually understand — then anchoring a tamper-evident hash of that consent on-chain.

<br>

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Python](https://img.shields.io/badge/python-3.10%2B-yellow)
![Solidity](https://img.shields.io/badge/solidity-0.8.19-lightgrey)
![Status](https://img.shields.io/badge/status-prototype-orange)

</div>

---

## 💡 The Problem

Most patients sign medical consent forms they don't understand. Dense legal language, no translation, and zero verification of comprehension turn "informed consent" into a signature ritual — a real risk to patient safety and a source of medical-legal disputes.

## 🎯 What PoC Does

PoC rebuilds the consent flow around **understanding first, signing second**:

1. **🤖 AI explains the procedure** in plain, patient-friendly language — overview, steps, risks, alternatives, and recovery.
2. **📝 A comprehension quiz** checks the patient actually understood before they can sign.
3. **✍️ The patient signs digitally**, gated behind a one-time password (OTP).
4. **⛓️ A cryptographic hash of the consent is recorded on-chain** — the full form stays private; only a tamper-evident fingerprint is anchored.

> **Prototype notice:** PoC is a hackathon / demo project. It shows the full flow end-to-end but is **not** a certified or production medical system. See [Current Limitations](#-current-limitations) for an honest breakdown of what's real versus stubbed.

---

## ✨ Features

### 👤 For Patients
- Clear, AI-generated procedure explanations (overview · steps · risks · alternatives · recovery)
- Browser voice narration for each section (text-to-speech)
- AI chat assistant to ask questions about the procedure
- Comprehension quiz before signing (client-side validation)
- Emergency mode that waives the quiz for time-critical cases
- Digital signature (typed or drawn), gated by a 6-digit OTP
- Print / save a copy of the signed consent

### 🩺 For Doctors
- Register / log in and generate an AI consent for any procedure
- Auto-generated 6-digit OTP + shareable patient link
- Local dashboard history with CSV / JSON export
- Blockchain verification view for recorded consents

### 🔒 Trust & Privacy Model
- Only a **SHA-256 hash** of the consent is stored on-chain — never the full form
- OTP gate on retrieving full consent data
- SHA-256 signature hashing
- Rate limiting on the API (30 requests/min)

---

## 🏗️ Architecture

PoC is built as **three independent services** plus a smart contract:

```
┌────────────────────────────────────────────────────────────────────┐
│                        FRONTEND  (static, :5502)                    │
│         Landing · Doctor Dashboard · Patient Portal · Sign          │
└───────────────┬────────────────────────────────────┬───────────────┘
                │ REST                                │ web3
                ▼                                     ▼
┌───────────────────────────────┐        ┌───────────────────────────┐
│   BACKEND API  (Node, :4000)  │  RPC   │   ConsentRegistry.sol     │
│   Express · Auth · Consent    │───────▶│   (Hardhat EVM)           │
│   AI (OpenRouter) · Blockchain│        │   hash + timestamp only   │
└───────────────┬───────────────┘        └───────────────────────────┘
                │  (optional, richer pipeline)
                ▼
┌────────────────────────────────────────────────────────────────────┐
│              AGENT SERVICE  (Python / FastAPI, :8000)               │
│   Research → Write → Enrich media → Review → Cache                  │
│                                                                     │
│   • Research:  PubMed · Wikipedia · MedlinePlus · Mayo Clinic       │
│   • LLM chain: Groq (Llama 3.3 70B) → Gemini 3.x → OpenRouter       │
│   • Media:     YouTube · Openverse · Wikimedia Commons              │
│   • Cache:     SQLite (instant repeat procedures)                   │
└────────────────────────────────────────────────────────────────────┘
```

> ℹ️ Today the **backend** generates consent content directly via **OpenRouter**. The **agent service** is a standalone, richer multi-source pipeline (`POST /api/generate-consent`) that runs independently — a drop-in upgrade path for the backend's AI step.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, Tailwind CSS, vanilla JS |
| **Backend API** | Node.js, Express, Helmet, Morgan, express-rate-limit |
| **Backend AI** | OpenRouter (`google/gemma-3-12b-it:free`) |
| **Agent Service** | Python, FastAPI, Uvicorn |
| **Agent LLM chain** | Groq `llama-3.3-70b-versatile` → Gemini 3.6/3.5/3.5-lite → OpenRouter |
| **Research sources** | PubMed · Wikipedia · MedlinePlus · Mayo Clinic |
| **Media sources** | YouTube Data API · Openverse · Wikimedia Commons |
| **Blockchain** | Solidity 0.8.19, Hardhat, Ethers.js |
| **Storage** | JSON files (backend) · SQLite (agent cache) · browser localStorage |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **Python** 3.10+ (only for the optional agent service)
- An **OpenRouter API key** (free tier works) for the backend AI

### 1. Clone

```bash
git clone https://github.com/Varun-ai07/PoC.git
cd PoC
```

### 2. Blockchain — local Hardhat node  *(Terminal 1)*

```bash
cd blockchain
npm install
npm run node          # starts a local EVM at http://127.0.0.1:8545
```

In a second terminal, deploy the contract:

```bash
cd blockchain
npm run deploy        # deploys ConsentRegistry to the local node
```

> ⚠️ The backend currently connects to a **local Hardhat node** and uses a hard-coded dev contract address in `backend/src/services/blockchain.service.js`. After deploying, update `CONTRACT_ADDRESS` there to match the freshly deployed address. (Base Sepolia values exist in `.env.example` as a roadmap target but aren't wired into Hardhat yet — see [Limitations](#-current-limitations).)

### 3. Backend API  *(Terminal 3)*

```bash
cd backend
npm install
cp .env.example .env      # then edit .env — set OPENROUTER_API_KEY
npm run dev               # http://localhost:4000
```

### 4. Frontend  *(Terminal 4)*

```bash
cd frontend
python3 -m http.server 5502
```

### 5. (Optional) Agent Service — richer AI pipeline  *(Terminal 5)*

```bash
cd agentservice
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# reads keys from ../backend/.env (GROQ_API_KEY, GEMINI_API_KEY, YOUTUBE_API_KEY, ...)
python3 main.py           # http://localhost:8000
```

### 🌐 Open the app

| Page | URL |
|------|-----|
| Landing | http://127.0.0.1:5502 |
| Doctor login | http://127.0.0.1:5502/doctor/login.html |
| Doctor dashboard | http://127.0.0.1:5502/doctor/dashboard.html |
| Patient portal | http://127.0.0.1:5502/patient_dashboard/patient.html |
| Backend health | http://localhost:4000/api/health |
| Agent health | http://localhost:8000/health |

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a doctor account |
| `POST` | `/api/auth/login` | Log in (returns user object) |

### Consent
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/consent/create` | Create consent (AI content + OTP + hash) |
| `POST` | `/api/consent/sign` | Patient signs (OTP required) |
| `GET`  | `/api/consent/:consentId` | Get consent — full data only with `?otp=` |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/explain` | Plain-text procedure explanation (legacy) |
| `POST` | `/api/ai/generate-content` | Structured consent content |
| `POST` | `/api/ai/ask` | Patient Q&A chat |

### Blockchain
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/blockchain/record` | Record a consent hash |
| `POST` | `/api/blockchain/sign-consent` | Record a signature hash |
| `GET`  | `/api/blockchain/verify/:consentId` | Verify by consent ID |
| `GET`  | `/api/blockchain/proof/:consentId` | Fetch stored proof |

### Agent Service (Python, :8000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Service health |
| `POST` | `/api/generate-consent` | Full research → write → media → review pipeline |

---

## ⛓️ Smart Contract

**`ConsentRegistry.sol`** (Solidity 0.8.19) — a gas-optimized registry that stores a **hash of the consent, not the consent itself**.

```solidity
struct ConsentRecord {
    bytes32 consentHash;    // fingerprint of the consent data
    address doctorWallet;   // who recorded it
    uint48  timestamp;      // when
    bool    emergencyMode;  // emergency flag
    bool    exists;         // presence check
}
```

- `recordConsent(...)` — anchor a consent hash + hashed consent ID
- `verifyConsent(hash)` — check a hash exists on-chain
- `getConsentById(idHash)` / `getConsentByHash(hash)` — read a record
- `totalConsents()` — count of recorded consents

> The on-chain preimage includes patient name, procedure, doctor, hospital and timestamp — hashed with SHA-256 before it ever leaves the backend. The readable form is never written to the chain.

---

## 📁 Project Structure

```
PoC/
├── agentservice/            # Python FastAPI multi-source AI pipeline
│   ├── main.py              # FastAPI app (:8000)
│   ├── pipeline.py          # research → write → media → review → cache
│   └── tools/               # llm · research · media · cache
│
├── backend/                 # Node.js Express API (:4000)
│   └── src/
│       ├── routes/          # auth · consent · ai · blockchain · quiz · health
│       ├── controllers/     # consent + blockchain logic
│       ├── services/        # ai.service · blockchain.service
│       └── middleware/      # rate limiting · error handling
│
├── blockchain/              # Solidity + Hardhat
│   ├── contracts/           # ConsentRegistry.sol
│   ├── scripts/deploy.js    # deployment
│   └── test/                # contract tests
│
├── frontend/                # Static site (serve on :5502)
│   ├── index.html           # landing + OTP access
│   ├── doctor/              # login · dashboard
│   └── patient_dashboard/   # patient portal · signature
│
└── README.md
```

---

## ⚙️ Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in what you use:

```env
# Backend AI (required for AI endpoints)
OPENROUTER_API_KEY=sk-or-v1-...

# Agent service LLM chain (optional, for richer pipeline)
GROQ_API_KEY=...
GEMINI_API_KEY=...
YOUTUBE_API_KEY=...

# Server
PORT=4000
FRONTEND_URL=http://localhost:5502
```

> 🔐 `.env` files are gitignored. Never commit real keys — only `.env.example` templates are tracked.

---

## ⚠️ Current Limitations

This is a **prototype**. In the spirit of honest documentation:

- **Auth is basic** — login returns a user object, with no session token or JWT yet.
- **OTP travels in the patient link URL** — fine for a demo, not for production.
- **Quiz enforcement is client-side** — the `/api/quiz/verify` endpoint is currently a stub; comprehension is validated in the browser.
- **Multi-language is planned, not wired** — the language selector is a placeholder in the patient UI.
- **Blockchain runs on a local Hardhat node** — Base Sepolia values live in `.env.example` as a roadmap target but aren't yet the active network; the backend uses a hard-coded local contract address.
- **Contract tests need updating** — the tracked tests target an older string-ID contract interface and don't pass against the current `bytes32` contract.
- **No formal compliance** — PoC is **not** HIPAA/GDPR certified and makes no legal guarantees.

These are the honest next steps, not hidden gaps — see the roadmap below.

---

## 🗺️ Roadmap

- [x] AI-generated, patient-friendly consent explanations
- [x] Comprehension quiz + digital signature flow
- [x] On-chain consent hash (local EVM)
- [x] Multi-source research + media enrichment agent
- [x] SQLite caching for instant repeat procedures
- [ ] Token/JWT-based sessions + secure OTP delivery
- [ ] Server-side quiz enforcement
- [ ] Live multi-language translation in the patient UI
- [ ] Base Sepolia / testnet deployment wired end-to-end
- [ ] Refreshed contract test suite
- [ ] Wire the agent service as the backend's default AI engine

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a feature branch — `git checkout -b feature/AmazingFeature`
3. Commit — `git commit -m 'Add AmazingFeature'`
4. Push — `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 👨‍💻 Authors

| Name | GitHub |
|------|--------|
| **Varun P** | [@Varun-ai07](https://github.com/Varun-ai07) |
| **Surya Prakash** | [@v-suryaprakash](https://github.com/v-suryaprakash) |

*Special thanks to **K. Gobinath** for the beautiful landing page design.*

## 🙏 Acknowledgments

[OpenRouter](https://openrouter.ai/) · [Groq](https://groq.com/) · [Google Gemini](https://ai.google.dev/) · [Hardhat](https://hardhat.org/) · [Tailwind CSS](https://tailwindcss.com/) · [PubMed](https://pubmed.ncbi.nlm.nih.gov/) · [Openverse](https://openverse.org/) · [Iconify](https://iconify.design/)

## 📄 License

Licensed under the **MIT License** — see [LICENSE](LICENSE).

---

<div align="center">

**Understand Before You Consent.**
*Designed for patients · built for clarity · anchored on-chain.*

</div>
