import { useState } from 'react';
import { useWallet } from '../hooks/useWalletDetection';
import './ConnectedWallet.css';

export default function ConnectedWallet() {
  const { connected, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  if (!connected) return null;

  const shortAddress = `${connected.address.slice(0, 5)}...${connected.address.slice(-4)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(connected.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = connected.address;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="connected-wallet">
      <div className="connected-header">
        <div className="connected-avatar">
          <span>{connected.icon}</span>
        </div>
        <div className="connected-info">
          <h3 className="connected-label">Connected Wallet</h3>
          <span className="connected-name">{connected.name}</span>
        </div>
        <span className="connected-dot" />
      </div>

      <div className="connected-address-row">
        <div className="address-display">
          <span className="address-full">{connected.address}</span>
          <span className="address-short">{shortAddress}</span>
        </div>
        <button className="icon-btn" onClick={handleCopy} title="Copy address">
          {copied ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 5L7 13L3 9" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="5" y="5" width="11" height="11" rx="2" stroke="#94A3B8" strokeWidth="1.5" />
              <path d="M13 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v9a1 1 0 001 1h2" stroke="#94A3B8" strokeWidth="1.5" />
            </svg>
          )}
        </button>
      </div>

      <div className="connected-network">
        <span className="network-label">Network</span>
        <span className="network-name">{connected.network}</span>
      </div>

      <button className="disconnect-btn" onClick={disconnect}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Disconnect
      </button>
    </div>
  );
}
