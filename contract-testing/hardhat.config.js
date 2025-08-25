require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Increased for better gas optimization on Mantle
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf"
          }
        }
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    // Mantle Mainnet
    mantle: {
      url: "https://rpc.mantle.xyz",
      chainId: 5000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000, // 0.02 gwei - Mantle has very low gas costs
      verify: {
        etherscan: {
          apiUrl: "https://explorer.mantle.xyz/api",
          apiKey: process.env.MANTLESCAN_API_KEY || "dummy"
        }
      }
    },
    // Mantle Testnet (Sepolia)
    mantleTestnet: {
      url: "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000, // 0.02 gwei
      verify: {
        etherscan: {
          apiUrl: "https://explorer.sepolia.mantle.xyz/api",
          apiKey: process.env.MANTLESCAN_API_KEY || "dummy"
        }
      }
    }
  },
  etherscan: {
    apiKey: {
      mantle: process.env.MANTLESCAN_API_KEY || "dummy",
      mantleTestnet: process.env.MANTLESCAN_API_KEY || "dummy"
    },
    customChains: [
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://explorer.mantle.xyz/api",
          browserURL: "https://explorer.mantle.xyz"
        }
      },
      {
        network: "mantleTestnet",
        chainId: 5003,
        urls: {
          apiURL: "https://explorer.sepolia.mantle.xyz/api",
          browserURL: "https://explorer.sepolia.mantle.xyz"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  }
};