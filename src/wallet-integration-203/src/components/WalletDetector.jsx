import { useWallet } from '../hooks/useWalletDetection';
import WalletModal from './WalletModal';
import WalletCard from './WalletCard';

export default function WalletDetector({ onOpenModal, showModal, onCloseModal }) {
  const { wallets, detected, connecting, connect } = useWallet();

  if (detected.length === 1) {
    const wallet = wallets.find((w) => w.id === detected[0].id);
    if (!wallet) return null;
    const isLoading = connecting === wallet.id;

    return (
      <div className="quick-connect">
        <div className="quick-connect-icon">{wallet.icon}</div>
        <h3 className="quick-connect-name">{wallet.name} Detected</h3>
        <button
          className="quick-connect-btn"
          onClick={() => connect(wallet.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="spinner" />
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-list">
      {detected.length > 1 && (
        <button className="show-all-btn" onClick={onOpenModal}>
          Connect Wallet
        </button>
      )}

      {detected.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="10" width="40" height="28" rx="4" stroke="#64748B" strokeWidth="2" />
              <circle cx="24" cy="24" r="6" stroke="#64748B" strokeWidth="2" />
              <path d="M24 20v4l2 2" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="empty-title">No wallet extension detected</h3>
          <p className="empty-desc">Install a wallet to get started with Web3</p>
          <div className="empty-actions">
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="empty-btn"
            >
              Install MetaMask
            </a>
            <a
              href="https://phantom.app/download"
              target="_blank"
              rel="noopener noreferrer"
              className="empty-btn empty-btn-secondary"
            >
              Install Phantom
            </a>
          </div>
        </div>
      )}

      {showModal && <WalletModal isOpen={showModal} onClose={onCloseModal} />}
    </div>
  );
}
