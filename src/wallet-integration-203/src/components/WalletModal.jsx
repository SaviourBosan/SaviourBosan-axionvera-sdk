import { useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWalletDetection';
import WalletCard from './WalletCard';
import './WalletModal.css';

export default function WalletModal({ isOpen, onClose }) {
  const { wallets, detected, error } = useWallet();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const installed = wallets.filter((w) => detected?.some((d) => d.id === w.id));
  const notInstalled = wallets.filter((w) => !detected?.some((d) => d.id === w.id));

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal-container" role="dialog" aria-modal="true" aria-label="Select a wallet">
        <div className="modal-header">
          <h2 className="modal-title">Select a Wallet</h2>
          <p className="modal-subtitle">Choose from the available wallets below</p>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="modal-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="#EF4444" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 11v.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {installed.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">Installed Wallets</h3>
              <div className="modal-wallet-list">
                {installed.map((w) => (
                  <WalletCard key={w.id} wallet={w} />
                ))}
              </div>
            </div>
          )}

          {notInstalled.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">Other Wallets</h3>
              <div className="modal-wallet-list">
                {notInstalled.map((w) => (
                  <WalletCard key={w.id} wallet={w} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
