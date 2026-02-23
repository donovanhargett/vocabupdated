import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ReadingEntry {
  id: string;
  author: string;
  title: string;
  description: string;
}

export const ReadingTab = () => {
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof ReadingEntry } | null>(null);
  const [editValue, setEditValue] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadEntries();

    const channel = supabase
      .channel('reading_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reading_list', filter: `user_id=eq.${user?.id}` },
        () => {
          loadEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadEntries = async () => {
    const { data } = await supabase
      .from('reading_list')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setEntries(data);
  };

  const addEntry = async () => {
    await supabase.from('reading_list').insert({
      user_id: user?.id,
      author: '',
      title: '',
      description: '',
    });
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('reading_list').delete().eq('id', id);
  };

  const startEdit = (id: string, field: keyof ReadingEntry, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    await supabase
      .from('reading_list')
      .update({ [editingCell.field]: editValue })
      .eq('id', editingCell.id);

    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Reading List</h2>
        <button
          onClick={addEntry}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add Entry
        </button>
      </div>

      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {entries.map((entry, index) => (
              <tr
                key={entry.id}
                className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}
              >
                {(['author', 'title', 'description'] as const).map((field) => (
                  <td
                    key={field}
                    className="px-6 py-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => startEdit(entry.id, field, entry[field])}
                  >
                    {editingCell?.id === entry.id && editingCell?.field === field ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        className="w-full px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-900 dark:text-white">
                        {entry[field] || <span className="text-gray-400 italic">Click to edit</span>}
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-6 py-4">
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                AUTHOR
              </label>
              {editingCell?.id === entry.id && editingCell?.field === 'author' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                  className="w-full px-3 py-2 border border-blue-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <div
                  onClick={() => startEdit(entry.id, 'author', entry.author)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white cursor-pointer"
                >
                  {entry.author || <span className="text-gray-400 italic">Tap to edit</span>}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                TITLE
              </label>
              {editingCell?.id === entry.id && editingCell?.field === 'title' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                  className="w-full px-3 py-2 border border-blue-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <div
                  onClick={() => startEdit(entry.id, 'title', entry.title)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white cursor-pointer"
                >
                  {entry.title || <span className="text-gray-400 italic">Tap to edit</span>}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                DESCRIPTION
              </label>
              {editingCell?.id === entry.id && editingCell?.field === 'description' ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                  rows={2}
                  className="w-full px-3 py-2 border border-blue-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <div
                  onClick={() => startEdit(entry.id, 'description', entry.description)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white cursor-pointer min-h-[60px]"
                >
                  {entry.description || <span className="text-gray-400 italic">Tap to edit</span>}
                </div>
              )}
            </div>

            <button
              onClick={() => deleteEntry(entry.id)}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Delete Entry
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
