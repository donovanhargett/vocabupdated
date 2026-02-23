import { ReactNode } from 'react';
import { Home, BookOpen, Library, Key, Moon, Sun, LogOut, Star, Newspaper } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout = ({ children, activeTab, onTabChange }: LayoutProps) => {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'review', label: 'Review', icon: BookOpen },
    { id: 'reading', label: 'Reading', icon: Library },
    { id: 'picks', label: 'My Picks', icon: Star },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'keys', label: 'Keys', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="md:flex md:h-screen">
        <aside className="hidden md:flex md:flex-col md:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VocabBuilder</h1>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 md:overflow-y-auto pb-20 md:pb-0">
          <div className="p-4 md:p-8">{children}</div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
