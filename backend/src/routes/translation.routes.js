import express from 'express';
import { translateConsentContent } from '../services/translation.service.js';
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
 * POST /api/translation/translate
 * Translate consent content to target language
 */
router.post('/translate', async (req, res) => {
    try {
        const { consentId, language, content } = req.body;

        if (!language) {
            return res.status(400).json({ success: false, error: 'language is required' });
        }

        // If content is provided directly, translate it
        if (content) {
            const translated = await translateConsentContent(content, language);
            return res.json({ success: true, content: translated, language });
        }

        // Otherwise, load consent from database
        if (!consentId) {
            return res.status(400).json({ success: false, error: 'consentId or content is required' });
        }

        const consents = await loadConsents();
        const consent = consents.find(c => c.consentId === consentId);

        if (!consent) {
            return res.status(404).json({ success: false, error: 'Consent not found' });
        }

        // Build content object from consent
        const contentToTranslate = {
            overview: consent.overview || consent.aiSummary || '',
            steps: consent.steps || [],
            risks: consent.risks || [],
            alternatives: consent.alternatives || [],
            recovery: consent.recovery || {},
            quiz: consent.quiz || { questions: [] }
        };

        const translated = await translateConsentContent(contentToTranslate, language);

        res.json({
            success: true,
            content: translated,
            language,
            consentId
        });

    } catch (err) {
        console.error('Translation error:', err);
        res.status(500).json({ success: false, error: 'Translation failed' });
    }
});

export default router;
