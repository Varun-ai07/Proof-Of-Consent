// src/controllers/consent.controller.js
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { generateConsentExplanation, generatePatientConsentContent } from '../services/ai.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const CONSENT_DIR = path.join(__dirname, '../generated-consents');
const DATA_PATH = path.join(DATA_DIR, 'consents.json');

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(CONSENT_DIR, { recursive: true });
}

async function loadConsents() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveConsents(consents) {
  await fs.writeFile(DATA_PATH, JSON.stringify(consents, null, 2));
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function renderList(items, renderItem) {
  return items.map(renderItem).join('');
}

// CREATE CONSENT WITH OTP
export async function createConsent(req, res) {
  try {
    const { 
      patientName, 
      procedure, 
      doctorId, 
      doctorName = 'Your Doctor', 
      language = 'en',
      otp  // ✅ NEW: OTP from request
    } = req.body;

    if (!patientName || !procedure || !doctorId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: patientName, procedure, doctorId' 
      });
    }

    // ✅ Generate OTP if not provided (6-digit)
    const finalOtp = otp || String(Math.floor(100000 + Math.random() * 900000));

    await ensureDirs();
    const consentId = `CNS_${Date.now()}`;

    // Generate structured content
    let content;
    try {
      content = await generatePatientConsentContent({ 
        procedure, 
        patientName, 
        doctorName, 
        language 
      });
    } catch (err) {
      console.warn('AI generation failed, using fallback:', err.message);
      const legacy = await generateConsentExplanation(procedure);
      content = {
        overview: legacy,
        steps: [],
        risks: [],
        alternatives: [],
        recovery: { summary: '', timeline: [], do: [], dont: [] },
        quiz: { questions: [] },
        metadata: { procedure, patientName, doctorName },
        plainTextSummary: legacy,
      };
    }

    // ✅ Generate consent hash for blockchain (only hash, not full form)
    const consentHashData = {
      patientName,
      procedure,
      doctorName,
      hospitalName: 'Default Hospital', // You'll get this from req.body
      timestamp: new Date().toISOString()
    };

    const hashString = JSON.stringify(consentHashData);
    const consentHash = crypto.createHash('sha256').update(hashString).digest('hex');


    // ✅ Store consent with OTP
    const consent = {
      consentId,
      patientName,
      procedure,
      doctorId,
      doctorName,
      otp: finalOtp,
      consentHash: consentHash,  // ✅ HASH stored in DB
      status: 'PENDING_PATIENT',
      patientSigned: false,
      doctorVerified: false,
      blockchainTx: null,
      blockchainStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      aiSummary: content.plainTextSummary || '',
      steps: content.steps || [],
      risks: content.risks || [],
      alternatives: content.alternatives || [],
      recovery: content.recovery || {},
      quiz: content.quiz || { questions: [] }
    };

    const consents = await loadConsents();
    consents.push(consent);
    await saveConsents(consents);

    // ✅ Record consent hash on blockchain via API call
    try {
      const blockchainResponse = await fetch('http://localhost:4000/api/blockchain/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentId,
          patientName,
          procedure,
          doctorName,
          hospitalName: 'Default Hospital',
          timestamp: consent.createdAt
        })
      });

      if (blockchainResponse.ok) {
        const blockchainData = await blockchainResponse.json();
        consent.blockchainStatus = 'RECORDED';
        console.log(`✅ Consent hash recorded on blockchain: ${consentId}`);
      }
    } catch (err) {
      console.warn('⚠️ Blockchain recording failed (non-blocking):', err.message);
      consent.blockchainStatus = 'FAILED';
    }

    // Build HTML (optional, for legacy /consents/:id.html access)
    const stepsHtml = renderList(content.steps || [], (s, idx) => `
      <li><strong>Step ${idx + 1}: ${escapeHtml(s.title)}</strong> — ${escapeHtml(s.description)}</li>
    `);

    const risksHtml = renderList(content.risks || [], (r) => `
      <li><strong>${escapeHtml(r.title)}</strong> (${escapeHtml(r.likelihood || 'n/a')}): ${escapeHtml(r.description)}</li>
    `);

    const altHtml = renderList(content.alternatives || [], (a) => `
      <li><strong>${escapeHtml(a.title)}</strong> — ${escapeHtml(a.description)} <em>${escapeHtml(a.whenRecommended || '')}</em></li>
    `);

    const timelineHtml = renderList((content.recovery?.timeline) || [], (t) => `
      <li><strong>${escapeHtml(t.label)}:</strong> ${escapeHtml(t.description)}</li>
    `);

    const doHtml = renderList((content.recovery?.do) || [], (d) => `<li>${escapeHtml(d)}</li>`);
    const dontHtml = renderList((content.recovery?.dont) || [], (d) => `<li>${escapeHtml(d)}</li>`);

    const quizHtml = renderList(content.quiz?.questions || [], (q) => {
      if (q.options) {
        return `
          <div style="margin-bottom:12px;">
            <p><strong>${escapeHtml(q.question)}</strong></p>
            <ul>
              ${Object.entries(q.options).map(([key, val]) => `<li>${escapeHtml(key)}. ${escapeHtml(val)}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      return `
        <div style="margin-bottom:12px;">
          <p><strong>${escapeHtml(q.question)}</strong></p>
          ${q.minWords ? `<p>Min words: ${q.minWords}</p>` : ''}
        </div>
      `;
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Medical Consent | ${escapeHtml(procedure)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; line-height: 1.6; color: #111827; }
    h1, h2, h3 { color: #0f172a; }
    section { margin-bottom: 24px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fff; }
    .actions { margin-top: 20px; }
    button { padding: 10px 14px; border: none; border-radius: 6px; background: #0ea5e9; color: #fff; cursor: pointer; }
    button:disabled { background: #94a3b8; cursor: not-allowed; }
    input[type="text"] { padding: 8px; width: 100%; max-width: 320px; border: 1px solid #e5e7eb; border-radius: 6px; }
    label { display: flex; align-items: center; gap: 8px; }
    ul { padding-left: 20px; }
    .muted { color: #6b7280; font-size: 0.95em; }
  </style>
</head>
<body>
  <h1>Informed Consent</h1>
  <p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>
  <p><strong>Procedure:</strong> ${escapeHtml(procedure)}</p>
  <p><strong>Doctor:</strong> ${escapeHtml(doctorName)}</p>
  <hr />

  <section class="card">
    <h2>Overview</h2>
    <p>${escapeHtml(content.overview || content.plainTextSummary || '')}</p>
  </section>

  <section class="card">
    <h2>Procedure Steps</h2>
    <ul>${stepsHtml || '<li>No steps available.</li>'}</ul>
  </section>

  <section class="card">
    <h2>Risks</h2>
    <ul>${risksHtml || '<li>Risks not listed.</li>'}</ul>
  </section>

  <section class="card">
    <h2>Alternatives</h2>
    <ul>${altHtml || '<li>Alternatives not listed.</li>'}</ul>
  </section>

  <section class="card">
    <h2>Recovery</h2>
    <p>${escapeHtml(content.recovery?.summary || '')}</p>
    <h3>Timeline</h3>
    <ul>${timelineHtml || '<li>Timeline not provided.</li>'}</ul>
    <div style="display:flex; gap:24px; flex-wrap:wrap;">
      <div>
        <h4>Do</h4>
        <ul>${doHtml || '<li>No items.</li>'}</ul>
      </div>
      <div>
        <h4>Don't</h4>
        <ul>${dontHtml || '<li>No items.</li>'}</ul>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>Check Your Understanding</h2>
    <div class="muted">Review these before signing.</div>
    ${quizHtml || '<p class="muted">Questions will appear here.</p>'}
  </section>

  <section class="card">
    <h2>Consent & Signature</h2>
    <label><input type="checkbox" id="understand" /> I confirm that I have read and understood the information above.</label>
    <div style="margin-top:12px;">
      <label for="signature">Type your full name as signature:</label>
      <input type="text" id="signature" />
    </div>
    <div class="actions">
      <button id="submitBtn" onclick="submitConsent()">Submit Digital Consent</button>
    </div>
    <p id="statusMsg" class="muted"></p>
  </section>

  <script>
    async function submitConsent() {
      const checked = document.getElementById('understand').checked;
      const signature = document.getElementById('signature').value.trim();
      const statusEl = document.getElementById('statusMsg');
      const btn = document.getElementById('submitBtn');

      if (!checked || !signature) {
        alert('Please confirm understanding and sign.');
        return;
      }

      btn.disabled = true;
      statusEl.textContent = 'Submitting...';

      const consentId = location.pathname.split('/').pop().replace('.html', '');
      const res = await fetch('/api/consent/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentId,
          patientSignature: signature,
          timestamp: new Date().toISOString()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        statusEl.textContent = data.error || 'Failed to sign consent';
        btn.disabled = false;
        return;
      }

      document.body.innerHTML = \`
        <h2>✅ Consent Signed</h2>
        <p>Your consent has been recorded.</p>
        <p>Status: \${data.status}</p>
      \`;
    }
  </script>
</body>
</html>
`;

    await fs.writeFile(path.join(CONSENT_DIR, `${consentId}.html`), html);

    // ✅ Return FULL consent data including AI content
    res.json({
      success: true,
      consent: consent,  // ✅ FULL CONSENT WITH AI CONTENT
      consentId,
      otp: finalOtp,
      status: consent.status,
      consentLink: `/consents/${consentId}.html`,
      patientPortalLink: `http://localhost:5502/patient_dashboard/patient.html?consentId=${consentId}&otp=${finalOtp}`
    });

  } catch (err) {
    console.error('Create consent error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create consent' 
    });
  }
}

// SIGN CONSENT
export async function signConsent(req, res) {
  try {
    const { consentId, patientSignature, timestamp, otp } = req.body;

    if (!consentId || !patientSignature) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: consentId, patientSignature' 
      });
    }

    const consents = await loadConsents();
    const consent = consents.find(c => c.consentId === consentId);

    if (!consent) {
      return res.status(404).json({ 
        success: false,
        error: 'Consent not found' 
      });
    }

    // ✅ OTP validation if consent requires it
    if (consent.otp && String(consent.otp) !== String(otp)) {
      return res.status(403).json({ 
        success: false,
        error: 'Invalid or missing OTP. Cannot sign without valid OTP.' 
      });
    }

    if (consent.status !== 'PENDING_PATIENT') {
      return res.status(409).json({
        success: false,
        error: `Consent cannot be signed in state ${consent.status}`
      });
    }

    consent.patientSigned = true;
    consent.patientSignature = patientSignature;
    consent.patientSignedAt = timestamp || new Date().toISOString();
    consent.status = 'SIGNED_BY_PATIENT';

    await saveConsents(consents);

    res.json({
      success: true,
      message: 'Consent signed successfully',
      consentId,
      status: consent.status
    });

  } catch (err) {
    console.error('Sign consent error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sign consent' 
    });
  }
}

// GET CONSENT BY ID
export async function getConsent(req, res) {
  try {
    const { consentId } = req.params;

    if (!consentId) {
      return res.status(400).json({ 
        success: false,
        error: 'Consent ID is required' 
      });
    }

    const consents = await loadConsents();
    const consent = consents.find(c => c.consentId === consentId);

    if (!consent) {
      return res.status(404).json({ 
        success: false,
        error: 'Consent not found' 
      });
    }

    // ✅ Return full consent data (including OTP for validation on frontend)
    res.json({
      success: true,
      ...consent
    });

  } catch (err) {
    console.error('Get consent error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch consent' 
    });
  }
}