import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getEthereumBalance, getEthereumTransactions, getSolanaBalance, getSolanaTransactions } from '../services/blockchain';

const WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    installUrl: 'https://metamask.io/download/',
    detect: () => typeof window !== 'undefined' && window.ethereum?.isMetaMask,
    connect: async () => {
      if (!window.ethereum?.isMetaMask) {
        throw new Error('MetaMask is not the active provider. Disable other wallet extensions or select MetaMask as your default.');
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return { address: accounts[0], chainId };
    },
    getNetworkName: (chainId) => {
      const networks = {
        '0x1': 'Ethereum Mainnet',
        '0x5': 'Goerli Testnet',
        '0xaa36a7': 'Sepolia Testnet',
        '0x89': 'Polygon Mainnet',
        '0x13881': 'Mumbai Testnet',
        '0xa': 'Optimism',
        '0xa4b1': 'Arbitrum',
        '0x38': 'BNB Chain',
      };
      return networks[chainId?.toLowerCase()] || `Chain ID: ${chainId}`;
    },
  },
  {
    id: 'rabby',
    name: 'Rabby',
    icon: '🟣',
    installUrl: 'https://rabby.io/',
    detect: () => typeof window !== 'undefined' && window.ethereum?.isRabby,
    connect: async () => {
      if (!window.ethereum?.isRabby) {
        throw new Error('Rabby is not the active provider. Disable other wallet extensions or select Rabby as your default.');
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return { address: accounts[0], chainId };
    },
    getNetworkName: (chainId) => WALLETS[0].getNetworkName(chainId),
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    installUrl: 'https://www.coinbase.com/wallet/download',
    detect: () => typeof window !== 'undefined' && window.ethereum?.isCoinbaseWallet,
    connect: async () => {
      if (!window.ethereum?.isCoinbaseWallet) {
        throw new Error('Coinbase Wallet is not the active provider. Disable other wallet extensions or select Coinbase as your default.');
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return { address: accounts[0], chainId };
    },
    getNetworkName: (chainId) => {
      const networks = {
        '0x1': 'Ethereum Mainnet',
        '0xaa36a7': 'Sepolia Testnet',
        '0x89': 'Polygon Mainnet',
      };
      return networks[chainId?.toLowerCase()] || `Chain ID: ${chainId}`;
    },
  },
  {
    id: 'brave',
    name: 'Brave Wallet',
    icon: '🦁',
    installUrl: 'https://brave.com/wallet/',
    detect: () => typeof window !== 'undefined' && window.ethereum?.isBraveWallet,
    connect: async () => {
      if (!window.ethereum?.isBraveWallet) {
        throw new Error('Brave Wallet is not the active provider. Use the Brave browser built-in wallet.');
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return { address: accounts[0], chainId };
    },
    getNetworkName: (chainId) => WALLETS[0].getNetworkName(chainId),
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '💎',
    installUrl: 'https://trustwallet.com/download',
    detect: () => typeof window !== 'undefined' && window.ethereum?.isTrust,
    connect: async () => {
      if (!window.ethereum?.isTrust) {
        throw new Error('Trust Wallet is not the active provider. Disable other wallet extensions or select Trust as your default.');
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return { address: accounts[0], chainId };
    },
    getNetworkName: (chainId) => WALLETS[0].getNetworkName(chainId),
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    installUrl: 'https://phantom.app/download',
    detect: () => typeof window !== 'undefined' && window.phantom?.solana,
    connect: async () => {
      const provider = window.phantom.solana;
      const resp = await provider.connect();
      return { address: resp.publicKey.toString(), chainId: 'solana' };
    },
    getNetworkName: () => 'Solana',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '🌤️',
    installUrl: 'https://solflare.com/download',
    detect: () => typeof window !== 'undefined' && window.solflare,
    connect: async () => {
      const provider = window.solflare;
      await provider.connect();
      return { address: provider.publicKey?.toString() || 'Connected', chainId: 'solana' };
    },
    getNetworkName: () => 'Solana',
  },
  {
    id: 'backpack',
    name: 'Backpack',
    icon: '🎒',
    installUrl: 'https://backpack.app/download',
    detect: () => typeof window !== 'undefined' && window.backpack,
    connect: async () => {
      const provider = window.backpack;
      const resp = await provider.connect();
      return { address: resp.publicKey?.toString() || 'Connected', chainId: 'solana' };
    },
    getNetworkName: () => 'Solana',
  },
];

const STORAGE_KEY = 'axionvera_connected_wallet';

function persistWallet(info) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      id: info.id,
      address: info.address,
      chainId: info.chainId,
      network: info.network,
    }));
  } catch {}
}

function clearPersistedWallet() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function loadPersistedWallet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallets, setWallets] = useState([]);
  const [detected, setDetected] = useState([]);
  const [connected, setConnected] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingChain, setLoadingChain] = useState(false);

  useEffect(() => {
    const detectedWallets = WALLETS.filter((w) => {
      try {
        return w.detect();
      } catch {
        return false;
      }
    });

    if (detectedWallets.length === 0 && typeof window !== 'undefined' && window.ethereum) {
      detectedWallets.push(WALLETS[0]);
    }

    setDetected(detectedWallets);
    setWallets(WALLETS);
  }, []);

  const fetchOnChainData = useCallback(async (walletInfo) => {
    setLoadingChain(true);
    try {
      if (walletInfo.chainId === 'solana') {
        const [bal, txs] = await Promise.all([
          getSolanaBalance(walletInfo.address),
          getSolanaTransactions(walletInfo.address),
        ]);
        if (bal !== null) setBalance(bal);
        if (txs) setTransactions(txs);
      } else if (window.ethereum) {
        const [bal, txs] = await Promise.all([
          getEthereumBalance(walletInfo.address),
          getEthereumTransactions(walletInfo.address),
        ]);
        if (bal !== null) setBalance(bal);
        if (txs) setTransactions(txs);
      }
    } catch (err) {
      console.error('Failed to fetch on-chain data:', err);
    } finally {
      setLoadingChain(false);
    }
  }, []);

  useEffect(() => {
    const saved = loadPersistedWallet();
    if (!saved) return;

    const wallet = WALLETS.find((w) => w.id === saved.id);
    if (!wallet) return;

    const info = {
      ...wallet,
      address: saved.address,
      chainId: saved.chainId,
      network: saved.network,
    };
    setConnected(info);

    if (info.chainId === 'solana') {
      fetchOnChainData(info);
    } else if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === info.address.toLowerCase()) {
          fetchOnChainData(info);
        }
      });
    }
  }, []);

  const connect = useCallback(async (walletId) => {
    const wallet = WALLETS.find((w) => w.id === walletId);
    if (!wallet) {
      console.error('Wallet not found:', walletId);
      return;
    }

    setConnecting(walletId);
    setError(null);

    try {
      const result = await wallet.connect();
      const info = {
        ...wallet,
        address: result.address,
        chainId: result.chainId,
        network: wallet.getNetworkName(result.chainId),
      };
      setConnected(info);
      persistWallet(info);
      fetchOnChainData(info);
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(null);
    }
  }, [fetchOnChainData]);

  const disconnect = useCallback(() => {
    setConnected(null);
    setError(null);
    setBalance(null);
    setTransactions([]);
    clearPersistedWallet();
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        disconnect();
      } else if (connected) {
        const info = { ...connected, address: accounts[0] };
        setConnected(info);
        persistWallet(info);
        fetchOnChainData(info);
      }
    };

    const handleChainChanged = () => {
      if (connected) {
        window.ethereum.request({ method: 'eth_chainId' }).then((chainId) => {
          const wallet = WALLETS.find((w) => w.id === connected.id);
          const info = {
            ...connected,
            chainId,
            network: wallet ? wallet.getNetworkName(chainId) : connected.network,
          };
          setConnected(info);
          persistWallet(info);
          fetchOnChainData(info);
        });
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [connected, disconnect]);

  const value = { wallets, detected, connected, connecting, error, connect, disconnect, balance, transactions, loadingChain };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
