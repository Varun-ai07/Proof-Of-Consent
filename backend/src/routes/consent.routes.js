import express from 'express';
import { createConsent, signConsent, getConsent } from '../controllers/consent.controller.js';

const router = express.Router();

// Doctor creates consent
router.post('/create', createConsent);

// Patient signs consent
router.post('/sign', signConsent);

// Get media for a procedure (calls agent service)
router.get('/media/:procedure', async (req, res) => {
    try {
        const { procedure } = req.params;
        const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
        const resp = await fetch(`${agentUrl}/api/generate-consent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ procedure, patient_name: 'Patient', doctor_name: 'Doctor', language: 'en' })
        });
        if (resp.ok) {
            const data = await resp.json();
            res.json({ success: true, media: data.media || { videos: [], images: [] } });
        } else {
            res.json({ success: true, media: { videos: [], images: [] } });
        }
    } catch (err) {
        res.json({ success: true, media: { videos: [], images: [] } });
    }
});

// Get consent by ID
router.get('/:consentId', getConsent);

export default router;