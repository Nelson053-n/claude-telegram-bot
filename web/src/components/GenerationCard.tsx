import React from 'react';
import { Generation } from '../lib/store';

interface GenerationCardProps {
  generation: Generation;
  onClick?: () => void;
}

export const GenerationCard: React.FC<GenerationCardProps> = ({ generation, onClick }) => {
  const date = new Date(generation.createdAt);
  const isCompleted = generation.status === 'completed';
  const isFailed = generation.status === 'failed';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 cursor-pointer border border-gray-200"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600 line-clamp-2">{generation.prompt}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            isCompleted
              ? 'bg-green-100 text-green-700'
              : isFailed
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {generation.status === 'pending' && '⏳ В процессе'}
          {generation.status === 'completed' && '✓ Готово'}
          {generation.status === 'failed' && '✗ Ошибка'}
        </span>
      </div>

      {isCompleted && generation.result && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700 line-clamp-3">
          {generation.result}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{date.toLocaleDateString('ru-RU')}</span>
        <span>{generation.tokensUsed} токенов</span>
      </div>
    </div>
  );
};
