import {useTranslations} from 'next-intl';
import ScamChecker from '@/components/ScamChecker';

export default async function HomePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;

  // Note: We're using useTranslations here just to pass the title/description for SEO/SSR if needed,
  // but the main logic is in the client component.
  // Actually, for a pure client experience inside the layout, we can just render the client component.

  // We need to fetch translations on the server if we want to render static parts,
  // but ScamChecker handles its own translations via client-side useTranslations.

  return (
    <main className="min-h-screen bg-gray-50/30">
        {/* Header Background Gradient */}
        <div className="absolute inset-0 h-96 bg-gradient-to-b from-blue-50 to-transparent -z-10" />

        <div className="container mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
            {/* Header */}
            <div className="text-center mb-12 max-w-2xl">
                <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-2xl mb-6">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
                    ScamCheck
                </h1>
                <p className="text-lg md:text-xl text-gray-600 font-medium">
                    Analyze messages instantly. Detect threats securely.
                </p>
            </div>

            <ScamChecker locale={locale} />
        </div>
    </main>
  );
}
