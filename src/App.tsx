import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthScreen } from './components/AuthScreen';
import { Layout } from './components/Layout';
import { HomeTab } from './components/HomeTab';
import { ReviewTab } from './components/ReviewTab';
import { ReadingTab } from './components/ReadingTab';
import { KeysTab } from './components/KeysTab';

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'home' && <HomeTab />}
      {activeTab === 'review' && <ReviewTab />}
      {activeTab === 'reading' && <ReadingTab />}
      {activeTab === 'keys' && <KeysTab />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
