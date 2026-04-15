import { useState } from 'react';
import { getClientNames } from '../data/clients-index';

interface Props {
  onSubmit: (memo: string, clientId?: string) => void;
  disabled: boolean;
}

export function MemoInput({ onSubmit, disabled }: Props) {
  const [memo, setMemo] = useState('');
  const [clientId, setClientId] = useState('');
  const clientNames = getClientNames();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memo.trim()) return;
    onSubmit(memo.trim(), clientId || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="mb-4">
        <label htmlFor="memo" className="block text-sm font-medium text-gray-300 mb-2">
          メモ・指示を入力
        </label>
        <textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          disabled={disabled}
          rows={10}
          className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white px-4 py-3 text-base placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none disabled:opacity-50 resize-y"
          placeholder="スライドにしたい内容のメモを入力してください..."
          maxLength={10000}
        />
        <p className="mt-1 text-xs text-gray-500 text-right">{memo.length} / 10,000</p>
      </div>

      <div className="mb-6">
        <label htmlFor="client" className="block text-sm font-medium text-gray-300 mb-2">
          クライアント（自動検出 or 手動選択）
        </label>
        <select
          id="client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white px-4 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none disabled:opacity-50"
        >
          <option value="">自動検出</option>
          {clientNames.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={disabled || !memo.trim()}
        className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-6 text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? '生成中...' : 'スライド生成開始'}
      </button>
    </form>
  );
}
