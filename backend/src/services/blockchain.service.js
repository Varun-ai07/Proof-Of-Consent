import { ethers } from 'ethers';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Read config from env (never hardcode secrets) ──────────
// Lazy-loaded so env vars are available after loadEnv() runs
let _config = null;
function getConfig() {
    if (_config) return _config;

    const envContract = process.env.CONTRACT_ADDRESS;
    const envRpc = process.env.RPC_URL;
    const envKey = process.env.DEPLOYER_PRIVATE_KEY;

    // Try reading deployment file for contract address fallback
    let deploymentContract = null;
    const deploymentsDir = path.join(__dirname, '../../blockchain/deployments');
    for (const name of ['baseSepolia.json', 'localhost.json']) {
        try {
            const filePath = path.join(deploymentsDir, name);
            if (fsSync.existsSync(filePath)) {
                const deployment = JSON.parse(fsSync.readFileSync(filePath, 'utf-8'));
                deploymentContract = deployment.contractAddress;
                break;
            }
        } catch { /* ignore */ }
    }

    _config = {
        rpcUrl: envRpc || 'https://sepolia.base.org',
        contractAddress: envContract || deploymentContract || '0x764bF8b277a2c08B7A5B309Bb6853c5576C6f168',
        deployerKey: envKey || null,
    };
    return _config;
}

// ✅ UPDATED ABI for optimized contract
const CONTRACT_ABI = [
    // Record consent - NOW takes bytes32 for consentIdHash instead of string
    "function recordConsent(bytes32 _consentIdHash, bytes32 _consentHash, address _patientWallet, bool _emergencyMode) external",
    
    // Verify consent exists
    "function verifyConsent(bytes32 _consentHash) external view returns (bool)",
    
    // Get consent by hash - returns tuple
    "function getConsentByHash(bytes32 _consentHash) external view returns (bytes32 consentHash, address doctorWallet, address patientWallet, uint48 timestamp, bool emergencyMode)",
    
    // Get consent by ID hash - returns tuple
    "function getConsentById(bytes32 _consentIdHash) external view returns (bytes32 consentHash, address doctorWallet, address patientWallet, uint48 timestamp, bool emergencyMode)",
    
    // Get total consents count
    "function totalConsents() external view returns (uint256)",
    
    // Event
    "event ConsentRecorded(bytes32 indexed consentHash, bytes32 indexed consentIdHash, address indexed doctorWallet, uint48 timestamp, bool emergencyMode)"
];

let provider;
let contract;
let signer;

/**
 * Initialize Web3 connection
 */
export async function initializeBlockchain() {
    try {
        const { rpcUrl, contractAddress, deployerKey } = getConfig();

        provider = new ethers.JsonRpcProvider(rpcUrl);

        if (deployerKey) {
            signer = new ethers.Wallet(deployerKey, provider);
        } else {
            // Fall back to first account on Hardhat node
            signer = await provider.getSigner(0);
        }

        contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

        console.log('✅ Blockchain service initialized');
        console.log(`   RPC: ${rpcUrl}`);
        console.log(`   Contract: ${contractAddress}`);
        console.log(`   Signer: ${signer.address}`);

        return true;
    } catch (error) {
        console.error('❌ Blockchain initialization failed:', error.message);
        return false;
    }
}

/**
 * Record consent on blockchain
 */
export async function recordConsentOnBlockchain({ consentId, consentHash, patientWallet, emergencyMode }) {
    try {
        if (!contract) {
            await initializeBlockchain();
        }

        // Hash the consent ID to bytes32 (required by optimized contract)
        const consentIdHash = ethers.keccak256(ethers.toUtf8Bytes(consentId));
        
        // Ensure consent hash is valid bytes32
        let cleanHash = consentHash.replace(/^0x/, '');
        if (cleanHash.length < 64) {
            cleanHash = cleanHash.padEnd(64, '0');
        }
        if (cleanHash.length > 64) {
            cleanHash = cleanHash.substring(0, 64);
        }
        const hashBytes32 = '0x' + cleanHash;

        console.log(`📝 Recording consent on blockchain: ${consentId}`);
        console.log(`   Hash: ${hashBytes32.slice(0, 20)}...`);

        // Call optimized contract with bytes32 parameters
        const tx = await contract.recordConsent(
            consentIdHash,                           // bytes32 - hashed consent ID
            hashBytes32,                             // bytes32 - consent data hash
            patientWallet || ethers.ZeroAddress,     // address - patient wallet
            emergencyMode || false                   // bool - emergency mode
        );

        console.log(`⏳ Transaction pending: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();

        console.log(`✅ Consent recorded on blockchain!`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

        return {
            success: true,
            consentId,
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            status: 'CONFIRMED'
        };

    } catch (error) {
        console.error('❌ Recording failed:', error.message);
        return {
            success: false,
            error: error.message,
            status: 'FAILED'
        };
    }
}

/**
 * Verify consent on blockchain
 */
export async function verifyConsentOnBlockchain(consentId, consentHash) {
    try {
        if (!contract) {
            await initializeBlockchain();
        }

        // Hash the consent ID to bytes32 (same as when recording)
        const consentIdHash = ethers.keccak256(ethers.toUtf8Bytes(consentId));
        
        try {
            // Call getConsentById with bytes32 hash
            const record = await contract.getConsentById(consentIdHash);
            
            // Record returns: (consentHash, doctorWallet, patientWallet, timestamp, emergencyMode)
            return {
                success: true,
                verified: true,
                consentId,
                consentHash: record[0],
                doctorWallet: record[1],
                patientWallet: record[2],
                timestamp: record[3].toString(),
                emergencyMode: record[4]
            };
        } catch (err) {
            // Consent not found on blockchain
            return {
                success: false,
                verified: false,
                consentId,
                message: 'Consent not found on blockchain'
            };
        }

    } catch (error) {
        return {
            success: false,
            verified: false,
            error: error.message
        };
    }
}

/**
 * Verify consent by hash directly
 */
export async function verifyConsentByHash(consentHash) {
    try {
        if (!contract) {
            await initializeBlockchain();
        }

        // Ensure hash is bytes32 format
        let cleanHash = consentHash.replace(/^0x/, '');
        if (cleanHash.length < 64) {
            cleanHash = cleanHash.padEnd(64, '0');
        }
        const hashBytes32 = '0x' + cleanHash;

        const exists = await contract.verifyConsent(hashBytes32);
        
        return {
            success: true,
            verified: exists,
            consentHash: hashBytes32
        };

    } catch (error) {
        return {
            success: false,
            verified: false,
            error: error.message
        };
    }
}

/**
 * Get all consents count from blockchain
 */
export async function getAllConsentsFromBlockchain() {
    try {
        if (!contract) {
            await initializeBlockchain();
        }

        // Optimized contract uses totalConsents() instead of array
        const total = await contract.totalConsents();

        console.log(`📊 Total consents on blockchain: ${total}`);

        return {
            success: true,
            totalConsents: parseInt(total.toString()),
            message: `${total} consents recorded`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check blockchain connection
 */
export async function checkBlockchainConnection() {
    try {
        if (!provider) {
            await initializeBlockchain();
        }

        const blockNumber = await provider.getBlockNumber();
        const signerAddr = signer.address;
        const balance = await provider.getBalance(signerAddr);

        return {
            success: true,
            connected: true,
            blockNumber,
            signerAddress: signerAddr,
            signerBalance: ethers.formatEther(balance),
            contractAddress: getConfig().contractAddress
        };

    } catch (error) {
        return {
            success: false,
            connected: false,
            error: error.message
        };
    }
}