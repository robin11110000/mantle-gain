# Mantle Gain

DEX aggregator on Mantle Network with chain abstraction and confidential trading.

## What it does

- **DEX Aggregation**: Best prices across Mantle DEXs
- **Chain Abstraction**: Trade across chains via Orby integration  
- **Embedded Wallets**: Para wallet infrastructure for seamless onboarding
- **Private Trading**: Marlin TEE-powered confidential strategies
- **Transaction Refunds**: Planned gas refund system (similar to "refund your SOL")

## Tech Stack

- **Blockchain**: Mantle Network (primary), multi-chain via Orby
- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Web3**: Wagmi, Viem, ethers.js v6
- **Privacy**: Marlin Protocol Oyster TEEs
- **Wallets**: Para embedded wallets + MetaMask

## Setup

```bash
git clone https://github.com/robin11110000/mantle-gain.git
cd mantle-gain
yarn install
yarn dev
```


```

## Current Status

| Feature | Status |
|---------|--------|
| Mantle Network Integration | ✅ |
| Wallet Connection | ✅ |
| Portfolio Tracking | ✅ |
| DEX Aggregation | ✅ |
| Transaction History | ✅ |
| Orby Chain Abstraction | 🔄 |
| Para Embedded Wallets | 🔄 |
| Marlin TEE Integration | 🔄 |
| Gas Refund System | 📋 |

## Architecture

```
Frontend (Next.js) → Wagmi/Viem → Mantle Network
                 ↘ Para Wallets
                 ↘ Orby (Chain Abstraction)  
                 ↘ Marlin TEE (Private Strategies)
```

## Roadmap

**Phase 1** ✅ Core DEX aggregator on Mantle  
**Phase 2** 🔄 Orby + Para + Marlin integration  
**Phase 3** 📋 Gas refund system + AI strategies  
**Phase 4** 📋 Cross-chain arbitrage automation

## Key Integrations

### Mantle Network
Primary L2 for low-cost trading

### Orby Chain Abstraction
Cross-chain operations without manual bridging

### Para Embedded Wallets  
Account abstraction with gas sponsorship

### Marlin TEE
Confidential execution for trading strategies

## Development

```bash
yarn dev        # Start dev server
yarn build      # Build for production  
yarn lint       # Run linter
yarn type-check # TypeScript validation
```

**Links:**
- **Demo**: [Live Application](https://www.youtube.com/watch?v=Tlsa3Z32Cp4)

Cookathon update:
currently the wallet integration works and the RPC endpoints are being fetched properly
<img width="1509" height="739" alt="image" src="https://github.com/user-attachments/assets/1afc1606-ab42-4287-bceb-e6ccc8d80640" />
<img width="1176" height="863" alt="image" src="https://github.com/user-attachments/assets/66fe075b-84a7-4269-a6cb-b59e441595dd" />
<img width="1128" height="503" alt="image" src="https://github.com/user-attachments/assets/499db37b-df96-498c-a8a5-5c3879dc75fa" />



