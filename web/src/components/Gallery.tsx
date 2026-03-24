import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { generationsAPI } from '../lib/api';
import { GenerationCard } from './GenerationCard';

export const Gallery: React.FC = () => {
  const { generations, selectedGeneration, setGenerations, setSelectedGeneration, isLoading, setLoading, error, setError } =
    useStore();
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadGenerations();
  }, [page]);

  const loadGenerations = async () => {
    try {
      setLoading(true);
      const response = await generationsAPI.list(50, page * 50);
      const newGenerations = response.data.generations;

      if (page === 0) {
        setGenerations(newGenerations);
      } else {
        setGenerations([...generations, ...newGenerations]);
      }

      setHasMore(newGenerations.length === 50);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">История генераций</h2>
        <span className="text-sm text-gray-600">{generations.length} результатов</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Ошибка: {error}
        </div>
      )}

      {generations.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Генераций нет. Создайте первую!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generations.map((generation) => (
              <GenerationCard
                key={generation.id}
                generation={generation}
                onClick={() => setSelectedGeneration(generation)}
              />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setPage(page + 1)}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Загрузка...' : 'Загрузить ещё'}
            </button>
          )}
        </>
      )}

      {/* Detail view */}
      {selectedGeneration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-bold">Детали генерации</h3>
              <button
                onClick={() => setSelectedGeneration(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Промпт</label>
                <p className="mt-1 p-3 bg-gray-50 rounded text-sm">{selectedGeneration.prompt}</p>
              </div>

              {selectedGeneration.result && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Результат</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                    {selectedGeneration.result}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Статус</label>
                  <p className="mt-1 text-sm">
                    {selectedGeneration.status === 'pending' && '⏳ В процессе'}
                    {selectedGeneration.status === 'completed' && '✓ Готово'}
                    {selectedGeneration.status === 'failed' && '✗ Ошибка'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Токены</label>
                  <p className="mt-1 text-sm">{selectedGeneration.tokensUsed}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Создано</label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedGeneration.createdAt).toLocaleString('ru-RU')}
                  </p>
                </div>
                {selectedGeneration.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Завершено</label>
                    <p className="mt-1 text-sm">
                      {new Date(selectedGeneration.completedAt).toLocaleString('ru-RU')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
