import { Newspaper } from 'lucide-react';

export const NewsTab = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">News</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Curated news feed — coming soon.
      </p>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-2 border-dashed border-gray-200 dark:border-gray-700 p-16 flex flex-col items-center justify-center text-center">
        <Newspaper size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">News Feed Coming Soon</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">
          This tab will pull headlines and articles via a web API. More details to come.
        </p>
      </div>
    </div>
  );
};
