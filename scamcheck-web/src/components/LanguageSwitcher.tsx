'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { ChangeEvent, useTransition } from 'react';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    startTransition(() => {
      router.replace(pathname, {locale: nextLocale});
    });
  }

  return (
    <div className="relative group" data-testid="language-switcher">
      <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-500">
         <Globe size={14} />
      </div>
      <select
        defaultValue={locale}
        onChange={onSelectChange}
        disabled={isPending}
        className="appearance-none bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 text-sm font-semibold rounded-full focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 block pl-9 pr-8 py-2 shadow-sm hover:shadow-md hover:bg-white transition-all cursor-pointer outline-none"
        aria-label="Select Language"
      >
        <option value="tr">Türkçe</option>
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
       <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  );
}
