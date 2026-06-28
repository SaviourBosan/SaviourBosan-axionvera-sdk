import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || '';
const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

export async function getEthereumBalance(address) {
  try {
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    return ethers.formatEther(balance);
  } catch (err) {
    console.error('Failed to fetch ETH balance:', err);
    return null;
  }
}

export async function getEthereumTransactions(address) {
  if (!ETHERSCAN_API_KEY) return null;

  try {
    const res = await fetch(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`
    );
    const data = await res.json();

    if (data.status !== '1') return [];

    return data.result.slice(0, 10).map((tx) => {
      const value = ethers.formatEther(tx.value);
      const isSend = tx.from.toLowerCase() === address.toLowerCase();
      return {
        id: tx.hash,
        type: isSend ? 'send' : 'receive',
        to: tx.to,
        from: tx.from,
        amount: value,
        token: 'ETH',
        time: formatTimestamp(tx.timeStamp),
        status: tx.txreceipt_status === '1' ? 'confirmed' : 'failed',
        hash: tx.hash,
      };
    });
  } catch (err) {
    console.error('Failed to fetch ETH transactions:', err);
    return [];
  }
}

export async function getSolanaBalance(address) {
  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const pubkey = new PublicKey(address);
    const balance = await connection.getBalance(pubkey);
    return (balance / 1e9).toFixed(4);
  } catch (err) {
    console.error('Failed to fetch SOL balance:', err);
    return null;
  }
}

export async function getSolanaTransactions(address) {
  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const pubkey = new PublicKey(address);
    const sigs = await connection.getSignaturesForAddress(pubkey, { limit: 10 });

    const txs = await Promise.allSettled(
      sigs.map(async (sig) => {
        const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
        if (!tx) return null;

        const preBalance = tx.meta?.preBalances?.[0] || 0;
        const postBalance = tx.meta?.postBalances?.[0] || 0;
        const diff = (preBalance - postBalance) / 1e9;
        const isSend = diff > 0;

        return {
          id: sig.signature,
          type: isSend ? 'send' : 'receive',
          amount: Math.abs(diff).toFixed(4),
          token: 'SOL',
          time: formatTimestamp(sig.blockTime),
          status: tx.meta?.err ? 'failed' : 'confirmed',
          hash: sig.signature,
        };
      })
    );

    return txs.filter((r) => r.status === 'fulfilled' && r.value !== null).map((r) => r.value);
  } catch (err) {
    console.error('Failed to fetch SOL transactions:', err);
    return [];
  }
}

function formatTimestamp(ts) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - Number(ts);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day ago`;
  return new Date(Number(ts) * 1000).toLocaleDateString();
}
