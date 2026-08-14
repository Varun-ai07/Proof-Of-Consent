/**
 * Frontend Configuration
 * Centralized config for API endpoints and settings
 */

const CONFIG = {
    // Backend API base URL
    API_BASE_URL: window.location.hostname === 'localhost'
        ? `http://localhost:${window.location.port || '4000'}`
        : `${window.location.protocol}//${window.location.host}`,

    // Specific API endpoints
    API: {
        AUTH: '/api/auth',
        CONSENT: '/api/consent',
        BLOCKCHAIN: '/api/blockchain',
        AI: '/api/ai',
        HEALTH: '/api/health'
    },

    // Blockchain settings
    BLOCKCHAIN: {
        // Contract address - must match blockchain/deployments/baseSepolia.json
        CONTRACT_ADDRESS: '0x764bF8b277a2c08B7A5B309Bb6853c5576C6f168'
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
