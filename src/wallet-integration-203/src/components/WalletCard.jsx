import { useWallet } from '../hooks/useWalletDetection';
import './WalletCard.css';

export default function WalletCard({ wallet }) {
  const { detected, connecting, connect } = useWallet();
  const isInstalled = detected?.some((w) => w.id === wallet.id);
  const isLoading = connecting === wallet.id;

  const handleClick = () => {
    if (isInstalled) {
      connect(wallet.id);
    } else {
      window.open(wallet.installUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`wallet-card ${isInstalled ? 'installed' : 'not-installed'}`}>
      <div className="wallet-card-icon">{wallet.icon}</div>
      <div className="wallet-card-info">
        <span className="wallet-card-name">{wallet.name}</span>
        <span className={`wallet-card-status ${isInstalled ? 'status-installed' : 'status-missing'}`}>
          {isInstalled ? 'Installed' : 'Not Installed'}
        </span>
      </div>
      <button
        className={`wallet-card-btn ${isInstalled ? 'btn-connect' : 'btn-install'} ${isLoading ? 'loading' : ''}`}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="spinner" />
        ) : isInstalled ? (
          'Connect'
        ) : (
          'Install'
        )}
      </button>
    </div>
  );
}
