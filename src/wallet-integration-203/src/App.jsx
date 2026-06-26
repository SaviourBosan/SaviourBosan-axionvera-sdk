import { WalletProvider, useWallet } from './hooks/useWalletDetection';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import './App.css';

function AppContent() {
  const { connected } = useWallet();

  if (connected) {
    return <Dashboard key="dash" />;
  }

  return <Home key="home" />;
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
