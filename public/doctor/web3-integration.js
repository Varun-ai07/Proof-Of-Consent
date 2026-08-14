import { initWeb3, recordConsentOnBlockchain } from '../../blockchain/lib/web3.js';

// Connect MetaMask on dashboard load
async function connectWallet() {
  try {
    const { account } = await initWeb3();
    document.getElementById('walletStatus').textContent = `Connected: ${account.slice(0, 6)}...`;
    localStorage.setItem('doctorWallet', account);
  } catch (error) {
    console.error('Wallet connection failed:', error);
    alert('MetaMask not found. Please install MetaMask.');
  }
}

// When consent is generated, record on blockchain
async function recordConsent(consentId, consentHash) {
  try {
    const doctorWallet = await getAccount();
    const patientWallet = document.getElementById('patientWallet').value;
    const emergencyMode = document.getElementById('emergencyMode').checked;
    
    const result = await recordConsentOnBlockchain(
      consentId,
      consentHash,
      patientWallet,
      emergencyMode
    );
    
    console.log('✅ Consent recorded on blockchain:', result);
    showAlert('success', `Consent recorded on blockchain! TX: ${result.transactionHash.slice(0, 10)}...`);
  } catch (error) {
    console.error('Blockchain recording failed:', error);
    showAlert('error', 'Failed to record on blockchain');
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', connectWallet);