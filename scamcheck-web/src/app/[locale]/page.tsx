import {useTranslations} from 'next-intl';
import ScamChecker from '@/components/ScamChecker';
import { ShieldCheck } from 'lucide-react';

export default async function HomePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;

  return (
    <main className="min-h-screen bg-slate-50/50">
        {/* Header Background Gradient */}
        <div className="absolute inset-0 h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent -z-10 pointer-events-none" />

        <div className="container mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
            {/* Header */}
            <div className="text-center mb-10 max-w-2xl animate-in fade-in slide-in-from-top-10 duration-700">
                <div className="inline-flex items-center justify-center p-4 bg-white rounded-3xl shadow-sm mb-6 ring-1 ring-slate-100">
                    <ShieldCheck className="w-10 h-10 text-blue-600" strokeWidth={1.5} />
                </div>
                <h1 data-testid="app-title" className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-4 drop-shadow-sm">
                    ScamCheck
                </h1>
                <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed">
                    Analyze suspicious messages instantly. <br className="hidden md:block"/>
                    Detect threats securely without leaving your device.
                </p>
            </div>

            <ScamChecker locale={locale} />
        </div>

        {/* Footer / Version */}
        <div className="py-8 text-center text-slate-400 text-xs font-medium">
             <p>Ruleset v1.0.0 • Secure Client-Side Analysis</p>
        </div>
    </main>
  );
}
