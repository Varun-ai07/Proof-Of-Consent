import express from 'express';
import { createConsent, signConsent, getConsent } from '../controllers/consent.controller.js';
import { enrichMedia } from '../services/media.service.js';

const router = express.Router();

// Doctor creates consent
router.post('/create', createConsent);

// Patient signs consent
router.post('/sign', signConsent);

// Get media for a procedure (standalone, no agent service needed)
router.get('/media/:procedure', async (req, res) => {
    try {
        const { procedure } = req.params;
        const media = await enrichMedia(decodeURIComponent(procedure));
        res.json({ success: true, media });
    } catch (err) {
        console.error('Media error:', err.message);
        res.json({ success: true, media: { videos: [], images: [] } });
    }
});

// Get consent by ID
router.get('/:consentId', getConsent);

export default router;