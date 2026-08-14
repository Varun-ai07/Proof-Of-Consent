# PoC — Proof of Consent

## Product Pitch Document

---

## 📋 Executive Summary

**PoC (Proof of Consent)** is a medical consent management platform that ensures patients truly understand what they're consenting to before medical procedures. We combine AI-powered explanations, interactive comprehension verification, and blockchain-anchored proof to transform "informed consent" from a legal checkbox into a genuine understanding milestone.

**Core Value Proposition:** *Understand Before You Consent.*

---

## 🎯 What Is This Project?

### The Product

PoC is an end-to-end consent workflow system that:

1. **Explains medical procedures** in plain, patient-friendly language using AI
2. **Verifies comprehension** through interactive quizzes before signing
3. **Creates tamper-evident records** by anchoring consent hashes on blockchain
4. **Provides accessibility** through multi-language support and voice narration

### The Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML5, Tailwind CSS, JavaScript | Patient portal, doctor dashboard |
| **Backend API** | Node.js, Express.js | Consent management, authentication |
| **AI Engine** | OpenRouter / Groq / Gemini | Content generation and explanation |
| **Research Agent** | Python, FastAPI | Multi-source medical fact gathering |
| **Blockchain** | Solidity, Hardhat, Ethers.js | Immutable consent proof registry |

### The Flow

```
Doctor creates consent → AI generates explanation → Patient reads & learns
→ Patient takes quiz → Patient signs with OTP → Hash recorded on blockchain
```

---

## ❓ Why Do We Need This Project?

### The Problem Is Real

**1. Patients Don't Understand What They Sign**

- Studies show over **70% of patients cannot explain their procedure** after signing consent forms
- Legal language is dense, technical, and often in English only
- Patients sign under stress, time pressure, and information asymmetry

**2. Current Consent Is a Legal Checkbox, Not Understanding**

- Consent forms are designed to protect hospitals, not inform patients
- No verification that the patient actually understood
- Forms are often signed minutes before surgery with no real discussion

**3. Disputes Arise From Informed Consent Failures**

- Medical malpractice claims frequently cite "lack of informed consent"
- Hospitals have no tamper-proof record of what was explained and signed
- Verbal explanations leave no evidence trail

**4. Language Barriers Exclude Non-English Speakers**

- In India, most consent forms are in English
- Patients who speak Tamil, Hindi, Telugu, Bengali often sign without comprehension
- No real-time translation or explanation in their language

### The Consequences

| Stakeholder | Impact |
|-------------|--------|
| **Patients** | Sign without understanding, unexpected outcomes, eroded trust |
| **Doctors** | Exposed to malpractice claims, no proof of informed consent |
| **Hospitals** | Legal liability, reputational damage, patient safety incidents |
| **Healthcare System** | Low trust, poor patient outcomes, avoidable litigation |

---

## 💥 Is This Really Impactful?

### Quantitative Impact Potential

| Metric | Current State | With PoC | Impact |
|--------|--------------|----------|--------|
| **Comprehension Rate** | ~30% of patients understand their procedure | Target: 80%+ after quiz | **2.7x improvement** |
| **Consent Disputes** | Leading cause of malpractice claims | Immutable proof on-chain | **Reduces litigation risk** |
| **Language Access** | English-only forms | 5 Indian languages | **Expands access to 60%+ more patients** |
| **Time to Explain** | 5-15 minutes per patient | AI-generated in seconds | **Frees doctor time** |

### Qualitative Impact

**For Patients:**
- Genuine understanding before signing
- Reduced anxiety through clear explanations
- Voice narration for accessibility
- AI chat to ask questions without judgment
- Permanent copy of what they consented to

**For Doctors:**
- Faster consent creation
- Standardized, consistent explanations
- Blockchain proof of patient understanding
- Emergency mode for time-critical cases

**For Hospitals:**
- Reduced legal exposure
- Audit trail for compliance
- Improved patient safety metrics
- Competitive differentiation through transparency

**For Healthcare Systems:**
- Higher trust in medical institutions
- Reduced malpractice litigation costs
- Better patient outcomes through informed decisions
- Alignment with patient rights and medical ethics

---

## 🌍 Who Needs This?

### Primary Users

| User | Pain Point | How PoC Helps |
|------|-----------|---------------|
| **Patients** | Don't understand consent forms | AI explains in plain language, quiz verifies understanding |
| **Doctors** | Time-consuming explanations, legal exposure | AI generates consent, blockchain provides proof |
| **Hospital Administrators** | Compliance risk, malpractice claims | Audit trail, immutable records |

### Secondary Stakeholders

| Stakeholder | Interest |
|-------------|----------|
| **Insurance Companies** | Reduced malpractice claims |
| **Medical Boards** | Better informed consent practices |
| **Patient Advocates** | Patient rights protection |
| **Legal Teams** | Defensible consent records |

### Target Markets

**Immediate:** Indian hospitals and clinics serving multilingual populations

**Near-term:** Emerging markets with language diversity and legal consent requirements

**Long-term:** Global healthcare systems seeking digital transformation

---

## 🏥 Real-World Use Cases

### Use Case 1: Elective Surgery

**Scenario:** A patient needs an appendectomy.

**Current Flow:**
1. Doctor hands over dense consent form
2. Patient signs without reading (10 seconds)
3. No record of what was explained
4. If complication occurs, patient claims "I wasn't told"

**PoC Flow:**
1. Doctor creates consent in PoC system (30 seconds)
2. AI generates procedure explanation in patient's language
3. Patient reads, listens (voice), asks AI chat questions
4. Patient takes quiz — must score 80% to proceed
5. Patient signs with OTP verification
6. Consent hash recorded on blockchain
7. Hospital has tamper-proof proof of informed consent

**Impact:** Patient understood, hospital protected, record immutable.

### Use Case 2: Emergency Procedure

**Scenario:** A patient needs emergency surgery after an accident.

**PoC Flow:**
1. Doctor enables "emergency mode"
2. Quiz requirement is waived (time-critical)
3. Consent generated and signed immediately
4. Emergency flag recorded on-chain
5. Post-surgery, patient can still access full explanation

**Impact:** No delay in care, emergency documented, patient can review later.

### Use Case 3: Non-English Speaking Patient

**Scenario:** A Tamil-speaking patient needs knee replacement.

**Current Flow:**
1. Consent form in English
2. Patient signs without understanding
3. Doctor verbally explains (no record)

**PoC Flow:**
1. Consent generated in English by AI
2. Patient portal translates to Tamil
3. Patient reads in their language
4. Voice narration in Tamil for accessibility
5. Quiz in Tamil verifies understanding
6. Signature and blockchain record

**Impact:** True informed consent, language barrier removed.

---

## 🔬 What Makes This Different?

### vs. Traditional Paper Consent

| Dimension | Paper Consent | PoC |
|-----------|--------------|-----|
| **Language** | Fixed (usually English) | 5+ languages, on-demand translation |
| **Explanation** | None (just legal text) | AI-generated patient-friendly content |
| **Verification** | None (just signature) | Quiz validates understanding |
| **Record** | Paper, can be lost/altered | Blockchain hash, tamper-evident |
| **Accessibility** | Text-only | Voice narration, AI chat |

### vs. Other Digital Consent Solutions

| Feature | Typical e-Consent | PoC |
|---------|------------------|-----|
| **AI Explanation** | ❌ No | ✅ Multi-source research, LLM-written |
| **Comprehension Verification** | ❌ No | ✅ Interactive quiz |
| **Blockchain Proof** | ❌ No | ✅ Immutable hash on-chain |
| **Multi-language** | Limited | ✅ 5 Indian languages |
| **Patient Chat** | ❌ No | ✅ AI assistant for questions |
| **Voice Narration** | ❌ No | ✅ Browser text-to-speech |

### Unique Differentiators

1. **AI-Powered Research Agent** — Pulls from PubMed, Wikipedia, MedlinePlus, Mayo Clinic for accurate medical facts
2. **Comprehension Gate** — Must pass quiz before signing; not just a signature
3. **Blockchain Anchoring** — Hash-only on-chain for privacy; full consent stays off-chain
4. **Emergency Mode** — Bypasses quiz for genuine emergencies, documented on-chain
5. **Multi-Source LLM Chain** — Groq → Gemini → OpenRouter fallback for reliability

---

## 📊 Market Opportunity

### Market Size

- **India Healthcare Market:** $372B (2022) → $638B (2025)
- **Medical Malpractice Insurance Market:** $15B globally
- **Patient Engagement Solutions Market:** $18B globally (2023)

### Why Now?

| Trend | Implication |
|-------|-------------|
| **Digital Health Acceleration** | Post-COVID, hospitals are adopting digital tools |
| **Patient Rights Movement** | Patients demanding transparency |
| **AI Maturity** | LLMs can now explain complex medical content accurately |
| **Blockchain Adoption** | Healthcare exploring blockchain for records |
| **Regulatory Pressure** | Stricter informed consent requirements |

### Competitive Landscape

| Competitor Type | Limitation | PoC Advantage |
|-----------------|------------|---------------|
| **Paper consent forms** | No verification, no accessibility | AI + quiz + blockchain |
| **E-signature tools** | No medical explanation | Full consent workflow |
| **Patient education apps** | Not linked to consent | Integrated consent + education |
| **Medical record systems** | Consent is an afterthought | Consent is the core product |

---

## 🚀 Go-to-Market Strategy

### Phase 1: Pilot (Months 1-3)
- Partner with 2-3 hospitals for pilot
- Focus on elective surgeries (appendectomy, knee replacement, C-section)
- Measure comprehension improvement, time savings, user satisfaction

### Phase 2: Validation (Months 4-6)
- Publish pilot results
- Refine based on feedback
- Add more procedures and languages

### Phase 3: Scale (Months 7-12)
- Expand to 20+ hospitals
- Integrate with hospital EMR systems
- Offer as SaaS product

### Revenue Model

| Model | Pricing | Target |
|-------|---------|--------|
| **Per-consent fee** | ₹50-100 per consent | Small clinics |
| **Hospital subscription** | ₹50,000-200,000/month | Mid-size hospitals |
| **Enterprise license** | Custom pricing | Hospital chains |

---

## 🛠️ Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PYTHON AGENT SERVICE (port 8000)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Research │→ │ Writer   │→ │  Media   │→ │ Reviewer │        │
│  │ PubMed   │  │ Groq/    │  │ YouTube  │  │ Groq/    │        │
│  │ Wiki     │  │ Gemini   │  │ Openverse│  │ Gemini   │        │
│  │ Medline  │  │          │  │ Wikimedia│  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                    ↓ SQLite Cache (instant repeat)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP API
┌──────────────────────────┴──────────────────────────────────────┐
│                  NODE.JS BACKEND (port 4000)                    │
│  Express.js + Auth + Rate Limiting                              │
│  Consent CRUD + Blockchain Recording + AI Integration           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Frontend   │  │   Hardhat    │  │   OpenRouter │
│  (port 5502) │  │   Blockchain │  │   (fallback) │
│  HTML/CSS/JS │  │   Contract   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Smart Contract: ConsentRegistry

```solidity
struct ConsentRecord {
    bytes32 consentHash;    // SHA-256 of consent data
    address doctorWallet;   // Who recorded it
    uint48  timestamp;      // When
    bool    emergencyMode;  // Emergency flag
    bool    exists;         // Presence check
}

function recordConsent(bytes32 _consentIdHash, bytes32 _consentHash, 
                       address _patientWallet, bool _emergencyMode) external;
function verifyConsent(bytes32 _consentHash) external view returns (bool);
function getConsentByHash(bytes32 _consentHash) external view returns (...);
```

### Security & Privacy

- **No health data on-chain** — Only SHA-256 hashes are recorded
- **OTP-gated access** — 6-digit code to retrieve full consent
- **Rate limiting** — 30 requests/minute on API
- **Input validation** — All user inputs sanitized
- **Local storage** — Consents stored in JSON files, not public cloud

---

## 🎓 SDG Alignment

This project directly contributes to:

| SDG | Alignment |
|-----|-----------|
| **SDG 3: Good Health & Well-being** | Ensures informed consent, improves patient safety |
| **SDG 10: Reduced Inequalities** | Multi-language support breaks language barriers |
| **SDG 16: Peace, Justice & Strong Institutions** | Blockchain provides tamper-evident legal proof |
| **SDG 9: Industry, Innovation & Infrastructure** | AI + blockchain innovation in healthcare |

---

## 📈 Success Metrics

### Patient Understanding
- Quiz pass rate: Target 85%+
- Post-consent comprehension survey: Target 90% "I understood"

### Operational Efficiency
- Time to create consent: < 1 minute
- Time for patient to complete: < 10 minutes
- Doctor time saved: 5-10 minutes per consent

### Legal Protection
- Blockchain verification success rate: 100%
- Consent dispute reduction: Target 50%

### User Satisfaction
- Patient satisfaction: Target 4.5/5
- Doctor satisfaction: Target 4.5/5

---

## 🗺️ Roadmap

### Current (Prototype)
- ✅ AI-generated consent explanations
- ✅ Comprehension quiz (client-side)
- ✅ Digital signature with OTP
- ✅ Blockchain hash recording (local EVM)
- ✅ Multi-language support (5 languages)
- ✅ Voice narration
- ✅ AI chat assistant

### Near-term (3-6 months)
- ⬜ Server-side quiz verification
- ⬜ JWT-based authentication
- ⬜ Base Sepolia testnet deployment
- ⬜ Hospital EMR integration
- ⬜ Mobile-responsive UI

### Long-term (6-12 months)
- ⬜ Mobile app (React Native)
- ⬜ Mainnet deployment (Polygon/Base)
- ⬜ IPFS for consent document storage
- ⬜ Multi-signature consent (guardian support)
- ⬜ Doctor training module

---

## 🤔 Anticipated Questions

### Q1: Is this legally binding?

**Answer:** This is a prototype demonstrating the workflow. For production use:
- The blockchain record provides tamper-evident proof that a consent was signed
- Legal validity depends on jurisdiction and hospital policy
- We recommend legal review before deployment in any medical setting

### Q2: What if the AI makes a mistake?

**Answer:**
- AI content is generated from authoritative sources (PubMed, MedlinePlus, Mayo Clinic)
- Medical reviewer agent checks accuracy before content is shown
- Doctors can edit AI-generated content before sending to patient
- Human review is recommended for first-time procedure generations

### Q3: How do you handle emergency situations?

**Answer:**
- Emergency mode bypasses the quiz requirement
- Emergency flag is recorded on blockchain
- Patient can still access full explanation post-procedure
- Ensures no delay in critical care

### Q4: What about patient privacy?

**Answer:**
- Only SHA-256 hashes are stored on blockchain — never the full consent
- Full consent data is stored in backend JSON files, not public
- OTP required to retrieve full consent details
- No patient health data is exposed on-chain

### Q5: How accurate is the AI?

**Answer:**
- Research agent pulls from authoritative medical sources
- LLM temperature set to 0.4 for accuracy over creativity
- Medical reviewer agent scores accuracy (target 90%+)
- Doctors review before sending to patients

### Q6: What languages are supported?

**Answer:**
- Currently: English, Hindi, Tamil, Telugu, Bengali
- Translation via MyMemory API (client-side)
- Can add more languages as needed

### Q7: How long does it take to generate a consent?

**Answer:**
- New procedure: 3-5 seconds (Groq) to 10-20 seconds (Gemini fallback)
- Cached procedure: < 100ms (SQLite cache)
- Blockchain recording: +2-3 seconds

### Q8: What if the patient doesn't pass the quiz?

**Answer:**
- Patient can re-read the explanation
- Can ask AI chat questions
- Can request doctor clarification
- Must pass before signing (unless emergency mode)

### Q9: How does blockchain help?

**Answer:**
- Provides tamper-evident proof that consent was recorded
- Timestamp proves when consent was given
- Cannot be altered or deleted
- Useful in legal disputes

### Q10: What's the cost?

**Answer:**
- Prototype is open-source (free to use)
- LLM costs: Groq free tier (30 RPM), Gemini free tier (15 RPM)
- Blockchain: Local Hardhat (free), Base Sepolia (testnet, free)
- Production deployment costs TBD

---

## 🏆 Why This Will Win

### 1. Solves a Real Problem
70%+ of patients don't understand consent. This isn't a nice-to-have — it's a patient safety issue.

### 2. Uses Technology Meaningfully
- AI for patient-friendly explanations (not just chat)
- Blockchain for immutable proof (not just hype)
- Quiz for verification (not just signature)

### 3. Complete Working Prototype
- End-to-end flow working
- Doctor dashboard, patient portal, signature, blockchain
- Not just a mockup or slides

### 4. Scalable Architecture
- Multi-source research agent
- LLM fallback chain for reliability
- SQLite caching for performance

### 5. Addresses Equity
- Multi-language support
- Voice narration for accessibility
- Designed for India's linguistic diversity

### 6. Clear Path to Production
- Identified limitations honestly
- Roadmap with realistic milestones
- Revenue model defined

---

## 👥 Team

| Name | Role | GitHub |
|------|------|--------|
| **Varun P** | Project Lead, Backend & Blockchain | [@Varun-ai07](https://github.com/Varun-ai07) |
| **Surya Prakash** | Frontend & Integration | [@v-suryaprakash](https://github.com/v-suryaprakash) |

*Special thanks to **K. Gobinath** for the beautiful landing page design.*

---

## 📞 Contact

- **Repository:** https://github.com/Varun-ai07/PoC
- **License:** MIT

---

<div align="center">

**"Understand Before You Consent."**

*Designed for patients. Trusted by doctors. Verifiable by law.*

</div>
