import express from 'express';
import { sendConsentEmail } from '../services/email.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '../data/consents.json');

const router = express.Router();

async function loadConsents() {
    try {
        const raw = await fs.readFile(DATA_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

/**
 * POST /api/email/send-consent
 * Send consent email to patient
 */
router.post('/send-consent', async (req, res) => {
    try {
        const { consentId, email } = req.body;

        if (!consentId) {
            return res.status(400).json({ success: false, error: 'consentId is required' });
        }

        // Load consent data
        const consents = await loadConsents();
        const consent = consents.find(c => c.consentId === consentId);

        if (!consent) {
            return res.status(404).json({ success: false, error: 'Consent not found' });
        }

        const patientEmail = email || consent.patientEmail;
        if (!patientEmail) {
            return res.status(400).json({ success: false, error: 'No email address provided or found in consent' });
        }

        const consentLink = `http://localhost:5502/patient_dashboard/patient.html?consentId=${consentId}&otp=${consent.otp}`;

        console.log(`📧 Sending consent email to ${patientEmail} for ${consentId}`);

        const result = await sendConsentEmail({
            to: patientEmail,
            patientName: consent.patientName,
            procedure: consent.procedure,
            consentId: consentId,
            otp: consent.otp,
            consentLink: consentLink
        });

        if (result.success) {
            res.json({
                success: true,
                message: `Email sent to ${patientEmail}`,
                messageId: result.messageId,
                previewUrl: result.previewUrl
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (err) {
        console.error('Email send error:', err);
        res.status(500).json({ success: false, error: 'Failed to send email' });
    }
});

export default router;
