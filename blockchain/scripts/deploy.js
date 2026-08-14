import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🚀 Deploying ConsentRegistry contract...");

  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  const networkName = hre.network.name;
  console.log(`📡 Network: ${networkName} (chainId: ${network.chainId})`);

  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`📍 Deploying with account: ${deployer.address}`);

  // Get deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${hre.ethers.formatEther(balance)} ETH`);

  // Deploy contract
  const ConsentRegistry = await hre.ethers.getContractFactory("ConsentRegistry");
  const contract = await ConsentRegistry.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`✅ ConsentRegistry deployed at: ${contractAddress}`);

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info (network-specific filename)
  const deploymentInfo = {
    contractAddress,
    deployerAddress: deployer.address,
    network: networkName,
    chainId: network.chainId.toString(),
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  const deploymentPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`📝 Deployment info saved to deployments/${networkName}.json`);
  console.log(`\n🔗 Contract address: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export async function initializeBlockchain() {
    try {
        provider = new ethers.JsonRpcProvider(RPC_URL);
        
        // Get the first account from Hardhat node (Account #0)
        // This is the account that deployed the contract
        const accounts = await provider.listAccounts();
        signer = provider.getSigner(0); // Use first account
        
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        const signerAddr = await signer.getAddress();
        console.log('✅ Blockchain service initialized');
        console.log(`   Contract: ${CONTRACT_ADDRESS}`);
        console.log(`   Signer: ${signerAddr}`);
        
        return true;
    } catch (error) {
        console.error('❌ Blockchain initialization failed:', error.message);
        return false;
    }
}