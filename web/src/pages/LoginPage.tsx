import React from 'react';

export const LoginPage: React.FC = () => {
  const handleTelegramLogin = () => {
    // Redirect to Telegram bot with web app
    const botName = 'newbot'; // Replace with your bot username
    const appUrl = encodeURIComponent(window.location.origin);
    window.location.href = `https://t.me/${botName}?start=web_app&redirect=${appUrl}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-500 to-secondary flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🤖 NewBot</h1>
          <p className="text-gray-600">Генерируй контент с помощью Claude AI</p>
        </div>

        <div className="space-y-4">
          <p className="text-center text-sm text-gray-600">
            Используйте Telegram для входа в приложение
          </p>

          <button
            onClick={handleTelegramLogin}
            className="w-full py-3 px-4 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.391 0-.704-.313-.704-.704v-.52l6.157-5.753c.267-.25-.058-.387-.41-.137L6.846 13.75l-2.948-.924c-.64-.203-.658-.64.135-.953l11.53-4.452c.54-.203 1.011.131.832.942z" />
            </svg>
            Войти через Telegram
          </button>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 text-center">
              Нажимая на кнопку, вы согласны с нашими условиями использования
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
