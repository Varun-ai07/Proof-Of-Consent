import { ethers } from "ethers";
import ConsentRegistryABI from "../artifacts/contracts/ConsentRegistry.sol/ConsentRegistry.json" assert { type: "json" };

let provider;
let signer;
let contract;
let contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // ✅ Updated// Update after deployment

/**
 * Initialize Web3 connection with MetaMask
 */
export async function initWeb3() {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  
  // Request account access
  await window.ethereum.request({ method: "eth_requestAccounts" });
  
  signer = await provider.getSigner();
  contract = new ethers.Contract(contractAddress, ConsentRegistryABI.abi, signer);
  
  console.log("✅ Web3 connected");
  return {
    provider,
    signer,
    contract,
    account: await signer.getAddress()
  };
}

/**
 * Get connected account
 */
export async function getAccount() {
  if (!signer) return null;
  return await signer.getAddress();
}

/**
 * Record consent hash on blockchain
 */
export async function recordConsentOnBlockchain(consentId, consentHash, patientWallet, emergencyMode) {
  if (!contract) {
    throw new Error("Web3 not initialized");
  }

  try {
    const hashBytes32 = consentHash.startsWith("0x") ? consentHash : "0x" + consentHash;
    
    const tx = await contract.recordConsent(
      consentId,
      hashBytes32,
      patientWallet,
      emergencyMode
    );

    console.log(`📝 Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Consent recorded on blockchain: Block ${receipt.blockNumber}`);

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTimestamp: receipt.timestamp,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error("Blockchain error:", error);
    throw error;
  }
}

/**
 * Verify consent hash on blockchain
 */
export async function verifyConsentOnBlockchain(consentHash) {
  if (!contract) {
    throw new Error("Web3 not initialized");
  }

  const hashBytes32 = consentHash.startsWith("0x") ? consentHash : "0x" + consentHash;
  const isVerified = await contract.verifyConsent(hashBytes32);
  return isVerified;
}

/**
 * Get consent record from blockchain
 */
export async function getConsentRecord(consentId) {
  if (!contract) {
    throw new Error("Web3 not initialized");
  }

  try {
    const record = await contract.getConsentById(consentId);
    return {
      consentHash: record.consentHash,
      doctorWallet: record.doctorWallet,
      patientWallet: record.patientWallet,
      timestamp: new Date(parseInt(record.timestamp) * 1000),
      emergencyMode: record.emergencyMode,
      verified: record.verified,
      consentId: record.consentId
    };
  } catch (error) {
    console.error("Error fetching consent record:", error);
    throw error;
  }
}

/**
 * Update contract address (after deployment)
 */
export function setContractAddress(newAddress) {
  contractAddress = newAddress;
  if (signer) {
    contract = new ethers.Contract(contractAddress, ConsentRegistryABI.abi, signer);
  }
}

export { provider, signer, contract };