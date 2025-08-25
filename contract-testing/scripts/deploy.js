const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Mantle-Gain contracts to Mantle network...");

  // Get the deployer account
  const [deployer, signer1, signer2] = await ethers.getSigners();
  console.log(`Deploying with the account: ${deployer.address}`);
  
  // Display account balance
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} MNT`);
  
  // Owners for the MultiSigWallet
  const multisigOwners = [deployer.address, signer1.address, signer2.address];

  // Deploy YieldAggregator
  console.log("Deploying YieldAggregator...");
  const YieldAggregator = await ethers.getContractFactory("YieldAggregator");
  const yieldAggregator = await YieldAggregator.deploy();
  await yieldAggregator.deployed();
  console.log(`YieldAggregator deployed to: ${yieldAggregator.address}`);

  // Deploy MultiSigWallet
  console.log("Deploying MultiSigWallet...");
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const requiredConfirmations = 2; // 2 out of 3 owners
  const multiSigWallet = await MultiSigWallet.deploy(
    multisigOwners,
    requiredConfirmations,
    yieldAggregator.address
  );
  await multiSigWallet.deployed();
  console.log(`MultiSigWallet deployed to: ${multiSigWallet.address}`);

  // Deploy MasterStrategyFactory
  console.log("Deploying MasterStrategyFactory...");
  const MasterStrategyFactory = await ethers.getContractFactory("MasterStrategyFactory");
  const masterFactory = await MasterStrategyFactory.deploy(
    yieldAggregator.address,
    multiSigWallet.address
  );
  await masterFactory.deployed();
  console.log(`MasterStrategyFactory deployed to: ${masterFactory.address}`);

  // Configure YieldAggregator
  console.log("Configuring YieldAggregator...");
  
  // Set MultiSigWallet in YieldAggregator
  const setMultiSigTx = await yieldAggregator.setMultiSigWallet(multiSigWallet.address);
  await setMultiSigTx.wait();
  console.log(`Set MultiSigWallet in YieldAggregator`);

  // Set emergency admin
  const setEmergencyAdminTx = await yieldAggregator.updateEmergencyAdmin(signer1.address);
  await setEmergencyAdminTx.wait();
  console.log(`Set emergency admin to: ${signer1.address}`);

  // Set fee collector
  const feeCollectorTx = await yieldAggregator.updateFeeCollector(deployer.address);
  await feeCollectorTx.wait();
  console.log(`Set fee collector to deployer address`);
  
  // Deploy some common test tokens for Mantle (if needed)
  console.log("Deploying test tokens for Mantle...");
  
  // Deploy mock USDC for testing
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const mockUSDC = await ERC20Mock.deploy(
    "Mock USDC", 
    "mUSDC", 
    deployer.address, 
    ethers.utils.parseUnits("1000000", 6) // 1M USDC with 6 decimals
  );
  await mockUSDC.deployed();
  console.log(`Mock USDC deployed to: ${mockUSDC.address}`);
  
  // Deploy mock WETH
  const mockWETH = await ERC20Mock.deploy(
    "Mock Wrapped Ether", 
    "mWETH", 
    deployer.address, 
    ethers.utils.parseEther("10000") // 10k WETH
  );
  await mockWETH.deployed();
  console.log(`Mock WETH deployed to: ${mockWETH.address}`);

  // Deploy mock MNT token
  const mockMNT = await ERC20Mock.deploy(
    "Mock Mantle Token", 
    "mMNT", 
    deployer.address, 
    ethers.utils.parseEther("1000000") // 1M MNT
  );
  await mockMNT.deployed();
  console.log(`Mock MNT deployed to: ${mockMNT.address}`);
  
  // Add supported assets to YieldAggregator
  console.log("Adding supported assets...");
  await yieldAggregator.addSupportedAsset(mockUSDC.address);
  await yieldAggregator.addSupportedAsset(mockWETH.address);
  await yieldAggregator.addSupportedAsset(mockMNT.address);
  console.log(`Added mock tokens as supported assets`);

  // Deploy some initial strategies using the factory
  console.log("Deploying initial strategies...");
  
  // Deploy a lending strategy for USDC
  const lendingStrategyTx = await masterFactory.deployLendingStrategy(
    "Mantle USDC Lending",
    "Mantle DeFi Protocol",
    mockUSDC.address,
    deployer.address, // Mock lending pool (replace with actual protocol address)
    500 // 5% initial APY
  );
  await lendingStrategyTx.wait();
  console.log(`Deployed USDC Lending Strategy`);

  // Deploy a liquidity strategy for MNT/WETH pair
  const liquidityStrategyTx = await masterFactory.deployLiquidityStrategy(
    "MNT-WETH LP",
    "Mantle DEX",
    mockMNT.address,
    mockWETH.address,
    deployer.address, // Mock LP token (replace with actual DEX LP token)
    800 // 8% initial APY
  );
  await liquidityStrategyTx.wait();
  console.log(`Deployed MNT-WETH Liquidity Strategy`);

  // Get the deployed strategy addresses
  const [lendingStrategies, farmingStrategies, liquidityStrategies] = await masterFactory.getAllStrategies();
  
  if (lendingStrategies.length > 0) {
    const lendingStrategy = lendingStrategies[lendingStrategies.length - 1];
    await yieldAggregator.addStrategy(lendingStrategy, "lending");
    await yieldAggregator.mapAssetToStrategy(mockUSDC.address, lendingStrategy);
    console.log(`Registered USDC Lending Strategy: ${lendingStrategy}`);
  }

  if (liquidityStrategies.length > 0) {
    const liquidityStrategy = liquidityStrategies[liquidityStrategies.length - 1];
    await yieldAggregator.addStrategy(liquidityStrategy, "liquidity");
    await yieldAggregator.mapAssetToStrategy(mockMNT.address, liquidityStrategy);
    await yieldAggregator.mapAssetToStrategy(mockWETH.address, liquidityStrategy);
    console.log(`Registered MNT-WETH Liquidity Strategy: ${liquidityStrategy}`);
  }

  console.log("\n===========================================");
  console.log("MANTLE DEPLOYMENT SUMMARY");
  console.log("===========================================");
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`YieldAggregator: ${yieldAggregator.address}`);
  console.log(`MultiSigWallet: ${multiSigWallet.address}`);
  console.log(`MasterStrategyFactory: ${masterFactory.address}`);
  console.log(`Mock USDC: ${mockUSDC.address}`);
  console.log(`Mock WETH: ${mockWETH.address}`);
  console.log(`Mock MNT: ${mockMNT.address}`);
  console.log(`Emergency Admin: ${await yieldAggregator.emergencyAdmin()}`);
  console.log(`Fee Collector: ${await yieldAggregator.feeCollector()}`);
  console.log("===========================================");

  // Save deployment addresses to a file for frontend integration
  const deploymentInfo = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      YieldAggregator: yieldAggregator.address,
      MultiSigWallet: multiSigWallet.address,
      MasterStrategyFactory: masterFactory.address,
      LendingStrategyFactory: await masterFactory.lendingFactory(),
      FarmingStrategyFactory: await masterFactory.farmingFactory(),
      LiquidityStrategyFactory: await masterFactory.liquidityFactory()
    },
    tokens: {
      mockUSDC: mockUSDC.address,
      mockWETH: mockWETH.address,
      mockMNT: mockMNT.address
    },
    strategies: {
      lending: lendingStrategies,
      farming: farmingStrategies,
      liquidity: liquidityStrategies
    },
    deployer: deployer.address,
    deploymentTime: new Date().toISOString()
  };

  const fs = require('fs');
  const path = require('path');
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  // Save deployment info
  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}-deployment.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`\nDeployment info saved to deployments/${network.name}-deployment.json`);
  
  // Verification instructions
  console.log("\n===========================================");
  console.log("VERIFICATION COMMANDS");
  console.log("===========================================");
  console.log("To verify contracts on Mantlescan, run:");
  console.log(`npx hardhat verify --network ${network.name} ${yieldAggregator.address}`);
  console.log(`npx hardhat verify --network ${network.name} ${multiSigWallet.address} "[${multisigOwners.map(addr => `"${addr}"`).join(',')}]" ${requiredConfirmations} ${yieldAggregator.address}`);
  console.log(`npx hardhat verify --network ${network.name} ${masterFactory.address} ${yieldAggregator.address} ${multiSigWallet.address}`);
  console.log("===========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });