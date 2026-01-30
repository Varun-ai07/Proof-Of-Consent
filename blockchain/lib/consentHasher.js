/**
 * Generate SHA-256 hash of consent form data
 * This hash is stored on blockchain instead of full consent form
 */
export async function generateConsentHash(consentData) {
  const consentString = JSON.stringify({
    patientName: consentData.patientName,
    procedure: consentData.procedure,
    procedureDate: consentData.procedureDate,
    doctorName: consentData.doctorName,
    hospitalName: consentData.hospitalName,
    timestamp: consentData.timestamp,
    emergencyMode: consentData.emergencyMode || false
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(consentString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    hash: hashHex,
    data: consentString,
    timestamp: new Date().toISOString()
  };
}

/**
 * Verify consent hash matches original data
 */
export async function verifyConsentHash(consentData, providedHash) {
  const { hash } = await generateConsentHash(consentData);
  return hash === providedHash;
}

/**
 * Convert hex string to bytes32 for Solidity
 */
export function hashToBytes32(hashHex) {
  return "0x" + hashHex;
}