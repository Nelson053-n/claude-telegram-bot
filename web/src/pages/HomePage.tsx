import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { usersAPI } from '../lib/api';
import { Gallery } from '../components/Gallery';

export const HomePage: React.FC = () => {
  const { user, setUser, setToken, isLoading, setLoading } = useStore();
  const [activeTab, setActiveTab] = useState<'gallery' | 'new' | 'profile'>('gallery');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getProfile();
      setUser(response.data);
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🤖 NewBot</h1>
            <p className="text-sm text-gray-600">@{user?.username}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Баланс</p>
              <p className="text-xl font-bold text-primary">{user?.tokenBalance || 0}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Выход
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          {(['gallery', 'new', 'profile'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'gallery' && '📋 Галерея'}
              {tab === 'new' && '➕ Новая'}
              {tab === 'profile' && '👤 Профиль'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'gallery' && <Gallery />}

        {activeTab === 'new' && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Скоро здесь будет форма для новой генерации</p>
            <p className="text-sm text-gray-500">Используйте Telegram бота для создания новых генераций</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <h2 className="text-xl font-bold">Профиль</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Username</label>
                  <p className="mt-1 text-gray-900">@{user?.username || 'unknown'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-gray-900">{user?.email || 'Не указан'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Баланс токенов</label>
                <p className="mt-1 text-3xl font-bold text-primary">{user?.tokenBalance || 0}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">ID</label>
                <p className="mt-1 text-sm text-gray-600">Telegram: {user?.telegramId}</p>
              </div>

              <div className="pt-4 border-t">
                <button className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:opacity-90">
                  💳 Купить токены
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
