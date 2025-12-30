import {useTranslations} from 'next-intl';

export default function HomePage() {
  const t = useTranslations('HomePage');

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-4 text-center text-blue-600">{t('title')}</h1>
        <p className="text-gray-600 text-center mb-8">{t('description')}</p>

        <div className="space-y-6">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">{t('messageLabel')}</label>
            <textarea
              id="message"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none h-32 resize-none"
              placeholder={t('messagePlaceholder')}
            ></textarea>
          </div>

          <div>
             <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">{t('urlLabel')}</label>
            <input
              type="text"
              id="url"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder={t('urlPlaceholder')}
            />
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200">
            {t('analyzeButton')}
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('resultTitle')}</h2>

          {/* Mock Result Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="bg-red-500 w-3 h-3 rounded-full mr-2"></span>
                <h3 className="font-semibold text-red-700">High Risk</h3>
              </div>
              <p className="text-sm text-red-600">This URL has been reported as phishing.</p>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="bg-green-500 w-3 h-3 rounded-full mr-2"></span>
                <h3 className="font-semibold text-green-700">Safe</h3>
              </div>
              <p className="text-sm text-green-600">Content analysis shows no suspicious keywords.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
