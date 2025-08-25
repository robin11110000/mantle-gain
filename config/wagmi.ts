import { http, createConfig } from 'wagmi';
import { mainnet, polygon, mantle, mantleTestnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Configure client with Mantle networks
export const config = createConfig({
  chains: [mainnet, polygon, mantle, mantleTestnet],
  transports: {
    [mainnet.id]: http('https://eth.llamarpc.com'),
    [polygon.id]: http('https://polygon-rpc.com'),
    [mantle.id]: http('https://rpc.mantle.xyz'),
    [mantleTestnet.id]: http('https://rpc.sepolia.mantle.xyz'),
  },
  connectors: [
    injected(),
  ],
});