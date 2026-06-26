import { useState } from 'react';
import { useWallet } from '../hooks/useWalletDetection';
import './Dashboard.css';

export default function Dashboard() {
  const { connected, disconnect, balance, transactions, loadingChain } = useWallet();
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!connected) return null;

  const shortAddress = `${connected.address.slice(0, 6)}...${connected.address.slice(-4)}`;
  const bal = balance !== null && balance !== undefined ? balance : '—';
  const currency = connected.chainId === 'solana' ? 'SOL' : 'ETH';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(connected.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
    <div className="dashboard">
      {/* ─── Top Bar ─── */}
      <nav className="dash-nav">
        <div className="dash-nav-inner">
          <div className="dash-logo">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="url(#dash-logo)" />
              <path d="M12 20l6 6 10-12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <defs><linearGradient id="dash-logo" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#4F46E5" /><stop offset="1" stopColor="#06B6D4" /></linearGradient></defs>
            </svg>
            <span className="dash-logo-text">Axionvera</span>
          </div>
          <div className="dash-nav-right">
            <span className="dash-network-badge">{connected.network}</span>
              <button className="dash-disconnect-btn" onClick={disconnect}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="dash-body">
        {/* ─── Wallet Overview Card ─── */}
        <div className="overview-card">
          <div className="overview-top">
            <div className="overview-wallet">
              <span className="overview-icon">{connected.icon}</span>
              <div>
                <span className="overview-label">{connected.name}</span>
                <span className="overview-status">Connected</span>
              </div>
            </div>
            <div className="overview-network">
              <span className="network-dot" />
              {connected.network}
            </div>
          </div>

          <div className="overview-balance">
            <span className="balance-label">Total Balance</span>
            {loadingChain && bal === '—' ? (
              <div className="balance-loading">
                <span className="spinner-lg" />
                <span className="balance-loading-text">Fetching balance...</span>
              </div>
            ) : (
              <div className="balance-amount">
                <span className="balance-value">{bal}</span>
                <span className="balance-currency">{currency}</span>
              </div>
            )}
          </div>

          <div className="overview-address">
            <span className="address-label">Wallet Address</span>
            <div className="address-row">
              <span className="address-value">{connected.address}</span>
              <span className="address-short">{shortAddress}</span>
              <button className="address-copy-btn" onClick={handleCopy}>
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 4L6 11L3 8" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="10" height="10" rx="2" stroke="#94A3B8" strokeWidth="1.5" /><path d="M12 3V2a1 1 0 00-1-1H3a1 1 0 00-1 1v8a1 1 0 001 1h1" stroke="#94A3B8" strokeWidth="1.5" /></svg>
                )}
              </button>
            </div>
          </div>

          <div className="overview-actions">
            <button className="action-btn action-send" onClick={() => setShowSend(true)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Send
            </button>
            <button className="action-btn action-receive" onClick={() => setShowReceive(true)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17 10H3M10 3l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Receive
            </button>
            <button className="action-btn action-copy" onClick={handleCopy}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="5" y="5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M15 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v11a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Copy Address
            </button>
          </div>
        </div>

        {/* ─── Transaction History ─── */}
        <div className="tx-section">
          <div className="tx-header">
            <h2 className="tx-title">Transaction History</h2>
            <span className="tx-count">{transactions.length} transactions</span>
          </div>

          {transactions.length > 0 && (
            <div className="tx-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="tx-item">
                  <div className={`tx-icon ${tx.type}`}>
                    {tx.type === 'send' ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v10M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : tx.type === 'receive' ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 14V4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8h12M8 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <div className="tx-info">
                    <span className="tx-desc">
                      {tx.type === 'send' ? `To ${tx.to?.slice(0, 6)}...${tx.to?.slice(-4) || ''}` : tx.type === 'receive' ? `From ${tx.from?.slice(0, 6)}...${tx.from?.slice(-4) || ''}` : tx.detail}
                    </span>
                    <span className="tx-time">{tx.time}</span>
                  </div>
                  <div className="tx-amount-wrap">
                    <span className={`tx-amount ${tx.type}`}>
                      {tx.type === 'send' ? '-' : '+'}{typeof tx.amount === 'string' ? parseFloat(tx.amount).toFixed(4) : tx.amount} {tx.token}
                    </span>
                    <span className="tx-status">{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingChain && transactions.length === 0 && (
            <div className="tx-empty">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="8" width="32" height="24" rx="4" stroke="#64748B" strokeWidth="2" />
                <path d="M4 16h32" stroke="#64748B" strokeWidth="2" />
              </svg>
              <p>No transactions yet</p>
            </div>
          )}

          {loadingChain && transactions.length === 0 && (
            <div className="tx-empty">
              <span className="spinner-lg" />
              <p>Loading transactions...</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Send Modal ─── */}
      {showSend && (
        <div className="modal-overlay" onClick={() => setShowSend(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <h3>Send</h3>
              <button className="modal-box-close" onClick={() => setShowSend(false)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13 5L5 13M5 5l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="modal-box-body">
              <div className="form-group">
                <label>Recipient Address</label>
                <input type="text" placeholder="0x..." className="form-input" />
              </div>
              <div className="form-group">
                <label>Amount ({currency})</label>
                <input type="number" placeholder="0.00" className="form-input" />
              </div>
              <button className="form-submit">Send Transaction</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receive Modal ─── */}
      {showReceive && (
        <div className="modal-overlay" onClick={() => setShowReceive(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <h3>Receive</h3>
              <button className="modal-box-close" onClick={() => setShowReceive(false)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13 5L5 13M5 5l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="modal-box-body receive-body">
              <p className="receive-hint">Share your wallet address to receive funds</p>
              <div className="receive-qr-placeholder">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect x="4" y="4" width="30" height="30" rx="4" stroke="#4F46E5" strokeWidth="3" />
                  <rect x="46" y="4" width="30" height="30" rx="4" stroke="#4F46E5" strokeWidth="3" />
                  <rect x="4" y="46" width="30" height="30" rx="4" stroke="#4F46E5" strokeWidth="3" />
                  <rect x="46" y="46" width="14" height="14" rx="2" stroke="#4F46E5" strokeWidth="3" />
                  <rect x="66" y="46" width="10" height="10" rx="2" stroke="#4F46E5" strokeWidth="3" />
                  <rect x="46" y="66" width="10" height="10" rx="2" stroke="#4F46E5" strokeWidth="3" />
                  <rect x="62" y="62" width="14" height="14" rx="2" stroke="#4F46E5" strokeWidth="3" />
                  <rect x="25" y="25" width="4" height="4" rx="1" fill="#4F46E5" />
                </svg>
              </div>
              <div className="receive-address-box">
                <span className="receive-address">{shortAddress}</span>
                <button className="address-copy-btn" onClick={handleCopy}>
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 4L6 11L3 8" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="10" height="10" rx="2" stroke="#94A3B8" strokeWidth="1.5" /><path d="M12 3V2a1 1 0 00-1-1H3a1 1 0 00-1 1v8a1 1 0 001 1h1" stroke="#94A3B8" strokeWidth="1.5" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
