import express from 'express';
import { createConsent, signConsent, getConsent } from '../controllers/consent.controller.js';

const router = express.Router();

// Doctor creates consent
router.post('/create', createConsent);

// Patient signs consent
router.post('/sign', signConsent);

// Get consent by ID
router.get('/:consentId', getConsent);

export default router;