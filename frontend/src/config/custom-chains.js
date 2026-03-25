export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet.monadexplorer.com' },
  },
}

export const polkadotTestnet = {
  id: 420420417,
  name: 'Polkadot Hub Testnet',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://services.polkadothub-rpc.com/testnet'] },
  },
  blockExplorers: {
    default: { name: 'RouteScan', url: 'https://polkadot.testnet.routescan.io' },
  },
}

// Define Somnia Testnet
export const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    public: { http: ['https://dream-rpc.somnia.network'], webSocket: ['wss://dream-rpc.somnia.network/ws'] },
    default: { http: ['https://dream-rpc.somnia.network'], webSocket: ['wss://dream-rpc.somnia.network/ws'] },
  },
  blockExplorers: {
    default: { name: 'Shannon Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
};