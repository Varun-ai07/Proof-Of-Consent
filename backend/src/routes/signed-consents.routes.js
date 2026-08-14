import express from 'express';
import { getDoctorConsents, getConsentPDFUrl } from '../services/supabase.service.js';
import { generateConsentPDF } from '../services/pdf.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/signed-consents/doctor/:doctorId
 * Get all signed consents for a doctor
 */
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;

        // Try Supabase first
        const result = await getDoctorConsents(doctorId);
        if (result.success) {
            return res.json({ success: true, consents: result.consents });
        }

        // Fallback: read from local JSON
        const DATA_PATH = path.join(__dirname, '../data/consents.json');
        try {
            const raw = await fs.readFile(DATA_PATH, 'utf-8');
            const allConsents = JSON.parse(raw);
            const doctorConsents = allConsents
                .filter(c => c.doctorId === doctorId && c.status === 'SIGNED_BY_PATIENT')
                .map(c => ({
                    consent_id: c.consentId,
                    doctor_id: c.doctorId,
                    patient_name: c.patientName,
                    procedure: c.procedure,
                    signed_at: c.patientSignedAt,
                    status: 'signed'
                }));
            return res.json({ success: true, consents: doctorConsents });
        } catch {
            return res.json({ success: true, consents: [] });
        }
    } catch (err) {
        console.error('Get doctor consents error:', err);
        res.status(500).json({ success: false, error: 'Failed to get consents' });
    }
});

/**
 * GET /api/signed-consents/pdf/:consentId
 * Download consent PDF
 */
router.get('/pdf/:consentId', async (req, res) => {
    try {
        const { consentId } = req.params;

        // Try Supabase first
        const urlResult = await getConsentPDFUrl(consentId);
        if (urlResult.success && urlResult.pdf_url) {
            return res.json({ success: true, pdfUrl: urlResult.pdf_url });
        }

        // Try local PDF
        const pdfPath = path.join(__dirname, '../generated-pdfs', `${consentId}.pdf`);
        try {
            await fs.access(pdfPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${consentId}.pdf"`);
            const pdfBuffer = await fs.readFile(pdfPath);
            return res.send(pdfBuffer);
        } catch {
            // No PDF found
        }

        // Generate PDF on the fly
        const DATA_PATH = path.join(__dirname, '../data/consents.json');
        try {
            const raw = await fs.readFile(DATA_PATH, 'utf-8');
            const allConsents = JSON.parse(raw);
            const consent = allConsents.find(c => c.consentId === consentId);
            if (!consent) {
                return res.status(404).json({ success: false, error: 'Consent not found' });
            }

            const pdfBuffer = await generateConsentPDF(consent);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${consentId}.pdf"`);
            return res.send(pdfBuffer);
        } catch {
            return res.status(404).json({ success: false, error: 'PDF not found' });
        }
    } catch (err) {
        console.error('Get PDF error:', err);
        res.status(500).json({ success: false, error: 'Failed to get PDF' });
    }
});

export default router;
