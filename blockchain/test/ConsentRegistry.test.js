const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ConsentRegistry", function () {
  let consentRegistry;
  let doctor;
  let patient;

  beforeEach(async function () {
    [doctor, patient] = await ethers.getSigners();
    const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
    consentRegistry = await ConsentRegistry.deploy();
  });

  it("Should record consent with hash", async function () {
    const consentHash = ethers.id("test-consent-data");
    const consentId = "CNS_1234567890";

    await expect(
      consentRegistry.recordConsent(consentId, consentHash, patient.address, false)
    )
      .to.emit(consentRegistry, "ConsentRecorded")
      .withArgs(consentHash, doctor.address, consentId, expect.any(BigInt), false);
  });

  it("Should verify consent hash", async function () {
    const consentHash = ethers.id("test-consent-data");
    const consentId = "CNS_1234567890";

    await consentRegistry.recordConsent(consentId, consentHash, patient.address, false);
    const isVerified = await consentRegistry.verifyConsent(consentHash);

    expect(isVerified).to.be.true;
  });

  it("Should retrieve consent by ID", async function () {
    const consentHash = ethers.id("test-consent-data");
    const consentId = "CNS_1234567890";

    await consentRegistry.recordConsent(consentId, consentHash, patient.address, false);
    const record = await consentRegistry.getConsentById(consentId);

    expect(record.consentHash).to.equal(consentHash);
    expect(record.consentId).to.equal(consentId);
  });
});