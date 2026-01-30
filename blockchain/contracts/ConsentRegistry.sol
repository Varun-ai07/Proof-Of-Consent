// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ConsentRegistry {
    
    // Packed struct - fits in 2 storage slots instead of 4+
    struct ConsentRecord {
        bytes32 consentHash;          // Slot 1: 32 bytes
        address doctorWallet;          // Slot 2: 20 bytes
        uint48 timestamp;              // Slot 2: 6 bytes (enough until year 8 million)
        bool emergencyMode;            // Slot 2: 1 byte
        bool exists;                   // Slot 2: 1 byte (replaces verified, saves lookup)
        // Patient wallet moved to separate mapping (often zero address)
    }
    
    // Main storage
    mapping(bytes32 => ConsentRecord) public consents;
    mapping(bytes32 => address) public consentPatients;  // Only stored if non-zero
    mapping(bytes32 => bytes32) public consentIdToHash;  // bytes32 instead of string
    
    // Counter instead of array (saves massive gas)
    uint256 public totalConsents;
    
    event ConsentRecorded(
        bytes32 indexed consentHash,
        bytes32 indexed consentIdHash,
        address indexed doctorWallet,
        uint48 timestamp,
        bool emergencyMode
    );
    
    /**
     * Record consent hash on blockchain
     * @param _consentIdHash - keccak256 hash of consent ID (computed off-chain)
     * @param _consentHash - hash of consent data
     * @param _patientWallet - patient wallet (can be zero)
     * @param _emergencyMode - emergency flag
     */
    function recordConsent(
        bytes32 _consentIdHash,
        bytes32 _consentHash,
        address _patientWallet,
        bool _emergencyMode
    ) external {
        require(_consentHash != bytes32(0), "Invalid hash");
        require(!consents[_consentHash].exists, "Already exists");
        
        // Single SSTORE for packed struct
        consents[_consentHash] = ConsentRecord({
            consentHash: _consentHash,
            doctorWallet: msg.sender,
            timestamp: uint48(block.timestamp),
            emergencyMode: _emergencyMode,
            exists: true
        });
        
        // Map consent ID hash to consent hash
        consentIdToHash[_consentIdHash] = _consentHash;
        
        // Only store patient if not zero (saves 20k gas when zero)
        if (_patientWallet != address(0)) {
            consentPatients[_consentHash] = _patientWallet;
        }
        
        unchecked {
            ++totalConsents;
        }
        
        emit ConsentRecorded(
            _consentHash,
            _consentIdHash,
            msg.sender,
            uint48(block.timestamp),
            _emergencyMode
        );
    }
    
    /**
     * Verify consent exists
     */
    function verifyConsent(bytes32 _consentHash) external view returns (bool) {
        return consents[_consentHash].exists;
    }
    
    /**
     * Get consent by hash
     */
    function getConsentByHash(bytes32 _consentHash) 
        external 
        view 
        returns (
            bytes32 consentHash,
            address doctorWallet,
            address patientWallet,
            uint48 timestamp,
            bool emergencyMode
        ) 
    {
        ConsentRecord storage record = consents[_consentHash];
        require(record.exists, "Not found");
        
        return (
            record.consentHash,
            record.doctorWallet,
            consentPatients[_consentHash],
            record.timestamp,
            record.emergencyMode
        );
    }
    
    /**
     * Get consent by ID hash
     */
    function getConsentById(bytes32 _consentIdHash) 
        external 
        view 
        returns (
            bytes32 consentHash,
            address doctorWallet,
            address patientWallet,
            uint48 timestamp,
            bool emergencyMode
        ) 
    {
        bytes32 hash = consentIdToHash[_consentIdHash];
        require(hash != bytes32(0), "ID not found");
        
        ConsentRecord storage record = consents[hash];
        return (
            record.consentHash,
            record.doctorWallet,
            consentPatients[hash],
            record.timestamp,
            record.emergencyMode
        );
    }
}