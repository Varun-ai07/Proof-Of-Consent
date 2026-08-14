import crypto from 'crypto';
import { ethers } from 'ethers';
import { recordConsentOnBlockchain, verifyConsentOnBlockchain, getAllConsentsFromBlockchain } from '../services/blockchain.service.js';

// In-memory storage for blockchain records (Supabase can be added later)
let blockchainRecords = [];

async function loadBlockchainRecords() {
  return blockchainRecords;
}

async function saveBlockchainRecords(records) {
  blockchainRecords = records;
}

/**
 * Generate SHA-256 hash of consent data
 * This is what gets stored on blockchain (NOT the full consent form)
 */
function generateConsentHash(consentData) {
  const dataString = JSON.stringify({
    patientName: consentData.patientName,
    procedure: consentData.procedure,
    doctorName: consentData.doctorName,
    hospitalName: consentData.hospitalName,
    timestamp: consentData.timestamp,
    emergencyMode: consentData.emergencyMode || false
  });

  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  
  return {
    hash,
    hashBytes32: '0x' + hash,
    data: dataString,
    timestamp: new Date().toISOString()
  };
}

/**
 * Record consent hash on blockchain
 * POST /api/blockchain/record
 */
export async function recordConsentHash(req, res) {
  try {
    const { consentId, consentHash, patientName, procedure, doctorName, hospitalName, timestamp } = req.body;

    if (!consentId || !consentHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: consentId, consentHash'
      });
    }

    await ensureDir();

    // Record on blockchain
    const blockchainResult = await recordConsentOnBlockchain({
      consentId,
      consentHash,
      patientWallet: null,
      emergencyMode: false
    });

    if (!blockchainResult.success) {
      return res.status(500).json(blockchainResult);
    }

    res.status(201).json({
      success: true,
      consentId,
      consentHash,
      transactionHash: blockchainResult.transactionHash,
      blockNumber: blockchainResult.blockNumber,
      gasUsed: blockchainResult.gasUsed,  // ✅ ADD THIS LINE
      status: blockchainResult.status,
      message: 'Consent recorded on blockchain'
    });

  } catch (error) {
    console.error('Blockchain record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Verify consent hash on blockchain
 * GET /api/blockchain/verify/:consentId
 */
export async function verifyConsentHash(req, res) {
  try {
    const { consentId } = req.params;

    if (!consentId) {
      return res.status(400).json({
        success: false,
        error: 'consentId is required'
      });
    }

    // Check blockchain first
    const result = await verifyConsentOnBlockchain(consentId, '');
    
    if (result.success && result.verified) {
      return res.json(result);
    }

    // Fallback to JSON records
    await ensureDir();
    const records = await loadBlockchainRecords();
    const record = records.find(r => r.consentId === consentId);

    if (!record) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Consent record not found on blockchain'
      });
    }

    res.json({
      success: true,
      verified: record.verified,
      consentId,
      consentHash: record.consentHash,
      recordedAt: record.recordedAt,
      blockchainStatus: record.blockchainStatus,
      transactionHash: record.transactionHash,
      message: 'Consent hash verified on blockchain'
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify consent'
    });
  }
}

/**
 * Get blockchain proof of consent
 * GET /api/blockchain/proof/:consentId
 */
export async function getConsentProof(req, res) {
  try {
    const { consentId } = req.params;

    if (!consentId) {
      return res.status(400).json({
        success: false,
        error: 'consentId is required'
      });
    }

    await ensureDir();
    const records = await loadBlockchainRecords();
    
    const record = records.find(r => r.consentId === consentId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Consent proof not found'
      });
    }

    const proof = {
      consentId: record.consentId,
      consentHash: record.consentHash,
      consentHashBytes32: record.consentHashBytes32,
      patientName: record.patientName,
      procedure: record.procedure,
      doctorName: record.doctorName,
      recordedAt: record.recordedAt,
      verified: record.verified,
      blockchainStatus: record.blockchainStatus,
      transactionHash: record.transactionHash,
      blockNumber: record.blockNumber,
      proofGeneratedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      proof
    });

  } catch (error) {
    console.error('Proof error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate proof'
    });
  }
}

/**
 * Record patient signature on blockchain
 * POST /api/blockchain/sign-consent
 */
export async function recordPatientSignature(req, res) {
  try {
    const { consentId, signatureHash, patientName, patientWallet } = req.body;

    if (!consentId || !signatureHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: consentId, signatureHash'
      });
    }

    // Record signature hash on blockchain
    const blockchainResult = await recordConsentOnBlockchain({
      consentId: `${consentId}_SIGNED`,
      consentHash: signatureHash,
      patientWallet: patientWallet || ethers.ZeroAddress,
      emergencyMode: false
    });

    if (!blockchainResult.success) {
      return res.status(500).json(blockchainResult);
    }

    res.status(201).json({
      success: true,
      consentId,
      signatureHash,
      signedAt: new Date().toISOString(),
      transactionHash: blockchainResult.transactionHash,
      blockNumber: blockchainResult.blockNumber,
      gasUsed: blockchainResult.gasUsed,  // ✅ ADD THIS LINE
      status: blockchainResult.status,
      message: 'Patient signature recorded on blockchain'
    });

  } catch (error) {
    console.error('Signature record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get all blockchain records
 * GET /api/blockchain/records
 */
export async function getAllBlockchainRecords(req, res) {
  try {
    // This endpoint is called by the frontend to get blockchain records
    // The frontend stores the data in localStorage with blockchainData property
    // We return an empty array since backend doesn't have direct access to frontend localStorage
    
    res.json({
      success: true,
      records: [],
      totalRecords: 0,
      message: 'Blockchain records are stored on the client side. Check your browser localStorage.'
    });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}