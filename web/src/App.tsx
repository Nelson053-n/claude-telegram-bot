import React, { useEffect } from 'react';
import { useStore } from './lib/store';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import './App.css';

export const App: React.FC = () => {
  const { token, user } = useStore();

  // Check for token in URL (from Telegram bot)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      useStore.setState({ token: urlToken });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (!token || !user) {
    return <LoginPage />;
  }

  return <HomePage />;
};

export default App;
