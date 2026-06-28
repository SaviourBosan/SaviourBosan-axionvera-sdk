import { useState } from 'react';
import { useWallet } from '../hooks/useWalletDetection';
import WalletModal from '../components/WalletModal';
import './Home.css';

export default function Home() {
  const { wallets, error, connecting } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="home">
      <nav className="navbar">
        <div className="nav-inner">
          <div className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="url(#logo-grad)" />
              <path d="M12 20l6 6 10-12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#4F46E5" />
                  <stop offset="1" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>
            <span className="nav-logo-text">Axionvera</span>
          </div>
          <button className={`nav-hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          </div>
        </div>
      </nav>
      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)} />}

      <section className="hero-section">
        <div className="hero-bg-glow" />
        <div className="hero-content">
          <div className="hero-badge">Web3 Wallet Connection</div>
          <h1 className="hero-title">
            Connect<span className="hero-highlight">.</span> Explore<span className="hero-highlight">.</span> Build<span className="hero-highlight">.</span>
          </h1>
          <p className="hero-desc">
            Connect your wallet securely and access the next generation of decentralized applications.
            One gateway to all of Web3.
          </p>

          <div className="hero-cta">
            <button className="cta-primary" onClick={() => setShowModal(true)} disabled={connecting}>
              {connecting ? (
                <span className="btn-spinner" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>

          {error && (
            <div className="hero-error">
              <span>{error}</span>
            </div>
          )}

          <div className="hero-marquee">
            {wallets.slice(0, 6).map((w) => (
              <span key={w.id} className="marquee-chip">{w.icon} {w.name}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="section-label">Features</div>
        <h2 className="section-title">Why Connect With Us</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure Connection</h3>
            <p>Your private keys never leave your device. All transactions are signed locally.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>Multi-Chain Support</h3>
            <p>Supports Ethereum, Solana, and L2 networks through a single interface.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Detection</h3>
            <p>Automatically detects installed wallets and connects with one click.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>No Tracking</h3>
            <p>We don't track your activity. Your data stays yours, always.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">Axionvera</span>
            <p>The Web3 wallet connection layer for the next generation internet.</p>
          </div>
          <div className="footer-links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Docs</a>
            <a href="#">Support</a>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Axionvera. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
