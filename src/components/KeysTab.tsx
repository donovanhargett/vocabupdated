import { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const KeysTab = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('openai_api_key')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data?.openai_api_key) {
      setApiKey(data.openai_api_key);
      setSaved(true);
    }
  };

  const saveKey = async () => {
    setSaving(true);
    try {
      await supabase.from('user_settings').upsert({
        user_id: user?.id,
        openai_api_key: apiKey,
        updated_at: new Date().toISOString(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">API Keys</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Configure your API keys to enable AI-powered features
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              OpenAI API Key
            </label>
            {saved && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                <Check size={16} />
                <span>Saved</span>
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Get your API key from{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              OpenAI's dashboard
            </a>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={saveKey}
            disabled={saving || !apiKey.trim()}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Key'}
          </button>

          <button
            onClick={testConnection}
            disabled={testing || !apiKey.trim()}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {testResult && (
          <div
            className={`flex items-center gap-2 p-4 rounded-lg ${
              testResult === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {testResult === 'success' ? (
              <>
                <Check size={20} />
                <span>Connection successful! Your API key is valid.</span>
              </>
            ) : (
              <>
                <AlertCircle size={20} />
                <span>Connection failed. Please check your API key.</span>
              </>
            )}
          </div>
        )}

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Your keys are stored securely and only used for your account. They
              are never shared or exposed to other users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
