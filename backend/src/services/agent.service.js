/**
 * Agent Service Client
 * Calls the Python agent service for AI-powered consent generation
 */

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

/**
 * Generate consent content using the agent service pipeline
 * @param {Object} params - Consent generation parameters
 * @param {string} params.procedure - Medical procedure name
 * @param {string} params.patient_name - Patient name
 * @param {string} params.doctor_name - Doctor name
 * @param {string} params.language - Language code (en, ta, hi, etc.)
 * @returns {Object} Generated consent content
 */
export async function generateConsentViaAgent({ procedure, patient_name, doctor_name, language = 'en' }) {
    try {
        console.log(`🤖 Calling agent service for consent generation...`);
        console.log(`   Procedure: ${procedure}`);
        console.log(`   Language: ${language}`);

        const response = await fetch(`${AGENT_SERVICE_URL}/api/generate-consent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ procedure, patient_name, doctor_name, language })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Agent service responded with ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log(`✅ Agent service returned consent content`);

        return {
            success: true,
            ...result
        };

    } catch (error) {
        console.error('❌ Agent service call failed:', error.message);

        // Return fallback structure so caller can handle gracefully
        return {
            success: false,
            error: error.message,
            fallback: true
        };
    }
}

/**
 * Check if agent service is healthy
 * @returns {Object} Health status
 */
export async function checkAgentServiceHealth() {
    try {
        const response = await fetch(`${AGENT_SERVICE_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!response.ok) {
            return { healthy: false, status: response.status };
        }

        const data = await response.json();
        return { healthy: true, ...data };

    } catch (error) {
        return { healthy: false, error: error.message };
    }
}
