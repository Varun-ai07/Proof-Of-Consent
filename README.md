# PoC - Proof of Consent

> AI-explained, doctor-approved medical consent with blockchain verification.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Solidity](https://img.shields.io/badge/solidity-%5E0.8.19-lightgrey)

## 🏥 Overview

**Proof of Consent (PoC)** is a medical consent management platform that ensures patients truly understand what they're consenting to before medical procedures. It combines:

- **🤖 AI-Powered Explanations** - Complex medical procedures explained in simple, patient-friendly language
- **⛓️ Blockchain Verification** - Immutable consent records stored on Ethereum for legal proof
- **👨‍⚕️ Doctor Dashboard** - Easy consent creation and patient management
- **📱 Patient Portal** - Interactive consent review with quizzes and AI chat support

## ✨ Features

### For Patients
- 📖 Clear, AI-generated procedure explanations
- ❓ Interactive comprehension quizzes
- 💬 AI chat assistant for questions
- 🔊 Voice narration support
- 🌐 Multi-language support (English, Hindi, Tamil, Telugu, Bengali)
- ✍️ Digital signature with OTP verification

### For Doctors
- 📝 Quick consent form generation
- 🔗 Secure patient link sharing with OTP
- 📊 Patient consent status tracking
- ⛓️ Blockchain transaction verification
- 🏥 Hospital/clinic branding

### Security & Compliance
- 🔐 OTP-protected consent access
- 🔗 SHA-256 consent hashing
- ⛓️ Ethereum blockchain immutability
- 🛡️ No patient health data stored on-chain

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│   Blockchain    │
│  (HTML/CSS/JS)  │     │   (Express.js)  │     │   (Hardhat)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌───────────────┐               │
        │               │  OpenRouter   │               │
        │               │   (LLM API)   │               │
        │               └───────────────┘               │
        │                       │                       │
        ▼                       ▼                       ▼
   Patient Portal      AI Content Gen         ConsentRegistry.sol
   Doctor Dashboard    Consent CRUD           Immutable Records
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Python 3 (for frontend server)
- OpenRouter API key (free tier available)

### 1. Clone the Repository

```bash
git clone https://github.com/Varun-ai07/PoC.git
cd PoC
```

### 2. Setup Blockchain (Terminal 1)

```bash
cd blockchain
npm install
npx hardhat node
```

### 3. Deploy Smart Contract (Terminal 2)

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Setup Backend (Terminal 3)

```bash
cd backend
npm install

# Create .env file
echo "OPENROUTER_API_KEY=your_api_key_here" > .env
echo "PORT=4000" >> .env

npm run dev
```

### 5. Start Frontend (Terminal 4)

```bash
cd frontend
python3 -m http.server 5502
```

### 6. Access the Application

- **Landing Page**: http://127.0.0.1:5502
- **Doctor Portal**: http://127.0.0.1:5502/doctor/land.html
- **API Health**: http://localhost:4000/api/health

## 📁 Project Structure

```
PoC/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic (AI, blockchain)
│   │   ├── middleware/      # Auth, rate limiting
│   │   └── data/            # JSON storage
│   └── package.json
│
├── blockchain/              # Ethereum smart contracts
│   ├── contracts/           # Solidity contracts
│   ├── scripts/             # Deployment scripts
│   ├── test/                # Contract tests
│   └── hardhat.config.js
│
├── frontend/                # Static web frontend
│   ├── index.html           # Landing page
│   ├── doctor/              # Doctor dashboard
│   └── patient_dashboard/   # Patient consent portal
│
└── README.md
```

## 🔌 API Endpoints

### Consent Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent` | Create new consent |
| GET | `/api/consent/:id` | Get consent by ID |
| POST | `/api/consent/:id/sign` | Patient signs consent |
| POST | `/api/consent/:id/verify` | Doctor verifies consent |

### AI Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/explain` | Get procedure explanation |
| POST | `/api/ai/generate-content` | Generate full consent content |
| POST | `/api/ai/ask` | Patient Q&A chat |

### Blockchain
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/blockchain/record` | Record consent hash |
| GET | `/api/blockchain/verify/:hash` | Verify consent on-chain |

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=4000
OPENROUTER_API_KEY=sk-or-v1-xxxxx
FRONTEND_URL=http://127.0.0.1:5502
```

### Blockchain (`blockchain/.env`)
```env
PRIVATE_KEY=0xac.......................
```
> ⚠️ The above is Hardhat's default test account. Never use in production!

## 🧪 Testing

### Run Blockchain Tests
```bash
cd blockchain
npm test
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:4000/api/health

# Generate AI content
curl -X POST http://localhost:4000/api/ai/generate-content \
  -H "Content-Type: application/json" \
  -d '{"procedure": "appendectomy"}'
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, Tailwind CSS, Vanilla JS |
| Backend | Node.js, Express.js |
| AI | OpenRouter API (Llama 3.3 70B) |
| Blockchain | Solidity, Hardhat, Ethers.js |
| Database | JSON file storage (MVP) |

## 🗺️ Roadmap

- [ ] PostgreSQL/MongoDB integration
- [ ] IPFS for consent document storage
- [ ] Multi-signature consent (guardian support)
- [ ] Video consent recording
- [ ] Hospital EMR/EHR integration
- [ ] Mobile app (React Native)
- [ ] Mainnet deployment (Polygon)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 👨‍💻 Authors

| | Name | GitHub |
|---|------|--------|
| 🧑‍💻 | **Varun** | [@Varun-ai07](https://github.com/Varun-ai07) |
| 🧑‍💻 | **Surya Prakash** | [@v-suryaprakash](https://github.com/v-suryaprakash) |

*And Thanks to Our beloved friend **K.GOBINATH** for the Beautiful Landing Page!!*


##  Acknowledgments

- [OpenRouter](https://openrouter.ai/) for LLM API access
- [Hardhat](https://hardhat.org/) for Ethereum development
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Iconify](https://iconify.design/) for icons

---

<p align="center">
  <strong>Understand Before You Consent.</strong><br>
  <em>Designed for patients, trusted by doctors, verifiable by law.</em>
</p>
