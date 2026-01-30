import express from 'express';
import { recordConsentHash, verifyConsentHash, getConsentProof, recordPatientSignature, getAllBlockchainRecords } from '../controllers/blockchain.controller.js';
const router = express.Router();

/**
 * POST /api/blockchain/record
 * Record consent hash on blockchain
 */
router.post('/record', recordConsentHash);

/**
 * POST /api/blockchain/sign-consent
 * Record patient signature on blockchain
 */
router.post('/sign-consent', recordPatientSignature);

/**
 * GET /api/blockchain/verify/:consentId
 * Verify consent hash on blockchain
 */
router.get('/verify/:consentId', verifyConsentHash);

/**
 * GET /api/blockchain/proof/:consentId
 * Get blockchain proof of consent
 */
router.get('/proof/:consentId', getConsentProof);

/**
 * GET /api/blockchain/records
 * Get all blockchain records
 */
router.get('/records', getAllBlockchainRecords);

export default router;