import { ethers } from "ethers";

// Inline ABI - avoids Vercel build issues with JSON imports
const ConsentRegistryABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "consentHash", "type": "bytes32"},
      {"indexed": true, "internalType": "bytes32", "name": "consentIdHash", "type": "bytes32"},
      {"indexed": true, "internalType": "address", "name": "doctorWallet", "type": "address"},
      {"indexed": false, "internalType": "uint48", "name": "timestamp", "type": "uint48"},
      {"indexed": false, "internalType": "bool", "name": "emergencyMode", "type": "bool"}
    ],
    "name": "ConsentRecorded",
    "type": "event"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "_consentIdHash", "type": "bytes32"}, {"internalType": "bytes32", "name": "_consentHash", "type": "bytes32"}, {"internalType": "address", "name": "_patientWallet", "type": "address"}, {"internalType": "bool", "name": "_emergencyMode", "type": "bool"}],
    "name": "recordConsent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "_consentHash", "type": "bytes32"}],
    "name": "verifyConsent",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "_consentHash", "type": "bytes32"}],
    "name": "getConsentByHash",
    "outputs": [
      {"internalType": "bytes32", "name": "consentHash", "type": "bytes32"},
      {"internalType": "address", "name": "doctorWallet", "type": "address"},
      {"internalType": "address", "name": "patientWallet", "type": "address"},
      {"internalType": "uint48", "name": "timestamp", "type": "uint48"},
      {"internalType": "bool", "name": "emergencyMode", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "_consentIdHash", "type": "bytes32"}],
    "name": "getConsentById",
    "outputs": [
      {"internalType": "bytes32", "name": "consentHash", "type": "bytes32"},
      {"internalType": "address", "name": "doctorWallet", "type": "address"},
      {"internalType": "address", "name": "patientWallet", "type": "address"},
      {"internalType": "uint48", "name": "timestamp", "type": "uint48"},
      {"internalType": "bool", "name": "emergencyMode", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalConsents",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

let provider;
let signer;
let contract;
let contractAddress = "0x764bF8b277a2c08B7A5B309Bb6853c5576C6f168";

export async function initWeb3() {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });
  signer = await provider.getSigner();
  contract = new ethers.Contract(contractAddress, ConsentRegistryABI, signer);
  console.log("✅ Web3 connected");
  return { provider, signer, contract, account: await signer.getAddress() };
}

export async function getAccount() {
  if (!signer) return null;
  return await signer.getAddress();
}

export async function recordConsentOnBlockchain(consentId, consentHash, patientWallet, emergencyMode) {
  if (!contract) throw new Error("Web3 not initialized");
  const hashBytes32 = consentHash.startsWith("0x") ? consentHash : "0x" + consentHash;
  const tx = await contract.recordConsent(consentId, hashBytes32, patientWallet, emergencyMode);
  console.log(`📝 Transaction submitted: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Consent recorded on blockchain: Block ${receipt.blockNumber}`);
  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    blockTimestamp: receipt.timestamp,
    gasUsed: receipt.gasUsed.toString()
  };
}

export async function verifyConsentOnBlockchain(consentHash) {
  if (!contract) throw new Error("Web3 not initialized");
  const hashBytes32 = consentHash.startsWith("0x") ? consentHash : "0x" + consentHash;
  return await contract.verifyConsent(hashBytes32);
}

export async function getConsentRecord(consentId) {
  if (!contract) throw new Error("Web3 not initialized");
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
}

export function setContractAddress(newAddress) {
  contractAddress = newAddress;
  if (signer) {
    contract = new ethers.Contract(contractAddress, ConsentRegistryABI, signer);
  }
}

export { provider, signer, contract };
