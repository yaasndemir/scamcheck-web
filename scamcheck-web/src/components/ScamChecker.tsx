'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Zap,
  Link as LinkIcon
} from 'lucide-react';
import { analyzeText, analyzeUrl, AnalysisResult } from '@/lib/rulesEngine';
import repliesData from '@/data/replies.json';
import { cn } from '@/lib/utils';

interface ScamCheckerProps {
  locale: string;
}

type ReplyCategory = keyof typeof repliesData.templates;

// Helper to extract first URL from text
const extractUrl = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : '';
};

export default function ScamChecker({ locale }: ScamCheckerProps) {
  const t = useTranslations('HomePage');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [autoDetectUrl, setAutoDetectUrl] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'safeReply'>('results');
  const [selectedCategory, setSelectedCategory] = useState<ReplyCategory>('bank');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleDemo = () => {
    // Demo text based on locale
    let demoText = '';
    if (locale === 'tr') {
      demoText = "Acil! Hesabınız askıya alındı. Hemen doğrulamak için tıklayın: http://banka-guvenlik-tr.com.tr.tc";
    } else if (locale === 'de') {
      demoText = "Dringend! Ihr Konto wurde gesperrt. Bestätigen Sie es sofort hier: http://secure-bank-de.xyz";
    } else {
      demoText = "Urgent! Your account has been suspended. Verify immediately at: http://secure-banking-alert.com";
    }
    setText(demoText);
    if (autoDetectUrl) {
      setUrl(extractUrl(demoText));
    }
  };

  const handleAnalyze = async () => {
    if (!text && !url) return;

    setIsAnalyzing(true);
    setResult(null); // Reset result to show loading clearly if needed

    // Simulate network delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));

    // Determine what to analyze
    let textResult = analyzeText(text, locale);
    let urlResult = { score: 0, reasons: [], tags: [] } as AnalysisResult;

    // Use the URL input if provided, otherwise extract from text if auto-detect is on
    const urlToAnalyze = url || (autoDetectUrl ? extractUrl(text) : '');

    if (urlToAnalyze) {
      urlResult = analyzeUrl(urlToAnalyze);
    }

    // Combine results (simple max strategy or weighted average)
    // Here we take the max score and merge reasons/tags
    const finalScore = Math.max(textResult.score, urlResult.score);
    const finalReasons = [...textResult.reasons, ...urlResult.reasons];
    const finalTags = Array.from(new Set([...textResult.tags, ...urlResult.tags]));

    setResult({
      score: finalScore,
      reasons: finalReasons,
      tags: finalTags
    });

    setIsAnalyzing(false);
    setActiveTab('results');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleAnalyze();
    }
  };

  // Auto detect URL logic
  useEffect(() => {
    if (autoDetectUrl && text) {
      const detected = extractUrl(text);
      if (detected && !url) {
        setUrl(detected);
      } else if (!detected && url && extractUrl(text) === url) {
         // Only clear if the user hasn't manually edited it to something else (simplification)
         // For now, let's just update if empty or matches previous extraction
         // If user typed a custom URL, don't overwrite it unless text changes significantly?
         // Let's keep it simple: if autoDetect is on, we sync.
         // Actually, if user manually entered URL, we might overwrite.
         // Let's just set it if URL input is empty.
         // Better: Update derived state or just use logic in handleAnalyze.
         // But UI shows the URL.
         // Let's stick to: if autoDetect is on, finding a URL in text updates the URL field.
         setUrl(detected);
      }
    }
  }, [text, autoDetectUrl]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getSeverity = (score: number) => {
    if (score < 30) return { label: t('results.severity.low'), color: 'text-green-600 bg-green-50 border-green-200', icon: ShieldCheck };
    if (score < 70) return { label: t('results.severity.medium'), color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: AlertTriangle };
    return { label: t('results.severity.high'), color: 'text-red-600 bg-red-50 border-red-200', icon: ShieldAlert };
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-20">
      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100"
      >
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('inputSection.placeholder')}
            className="w-full h-40 p-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none text-lg bg-gray-50/50"
          />
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <button
              onClick={handleDemo}
              data-testid="demo-button"
              className="px-3 py-1 text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors bg-white rounded-md shadow-sm border border-gray-200"
            >
              {t('inputSection.demoButton')}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                showUrlInput ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <LinkIcon size={16} />
              <span>URL</span>
            </button>
            <label className="flex items-center space-x-2 text-sm text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoDetectUrl}
                onChange={(e) => setAutoDetectUrl(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{t('inputSection.autoDetectUrl')}</span>
            </label>
          </div>
        </div>

        <AnimatePresence>
          {showUrlInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('inputSection.urlPlaceholder')}
                className="w-full mt-3 p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-gray-50/50"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleAnalyze}
          data-testid="analyze-button"
          disabled={isAnalyzing || (!text && !url)}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
        >
          {isAnalyzing ? (
            <>
               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
               <span>{t('inputSection.analyzing')}</span>
            </>
          ) : (
            <>
              <Zap size={20} className="fill-current" />
              <span>{t('inputSection.analyzeButton')}</span>
            </>
          )}
        </button>
      </motion.div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {result && !isAnalyzing && (
          <motion.div
            key="results"
            data-testid="results-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit mx-auto">
              {(['results', 'safeReply'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  data-testid={tab === 'safeReply' ? 'safe-reply-tab' : undefined}
                  className={cn(
                    "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {t(`safeReply.tabs.${tab}`)}
                </button>
              ))}
            </div>

            {activeTab === 'results' ? (
               <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                 <div className="p-8">
                   <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                     <div className="flex items-center gap-6">
                       <div className="relative w-24 h-24 flex items-center justify-center">
                          {/* Simple CSS Ring */}
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              className="text-gray-100"
                              strokeWidth="8"
                              stroke="currentColor"
                              fill="transparent"
                              r="40"
                              cx="48"
                              cy="48"
                            />
                            <circle
                              className={cn(
                                "transition-all duration-1000 ease-out",
                                result.score < 30 ? "text-green-500" : result.score < 70 ? "text-yellow-500" : "text-red-500"
                              )}
                              strokeWidth="8"
                              strokeDasharray={251.2}
                              strokeDashoffset={251.2 - (251.2 * result.score) / 100}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                              r="40"
                              cx="48"
                              cy="48"
                            />
                          </svg>
                          <span className="absolute text-2xl font-bold text-gray-800">{result.score}</span>
                       </div>
                       <div>
                         <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">{t('results.riskScore')}</div>
                         <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border", getSeverity(result.score).color)}>
                           {React.createElement(getSeverity(result.score).icon, { size: 16, className: "mr-2" })}
                           {getSeverity(result.score).label}
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Why Flagged */}
                   {result.reasons.length > 0 && (
                     <div className="mb-8">
                       <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('results.whyFlagged')}</h3>
                       <div className="space-y-3">
                         {result.reasons.map((reason, idx) => (
                           <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="bg-gray-50 p-4 rounded-xl border-l-4 border-blue-500 text-gray-700 text-sm"
                           >
                             {reason}
                           </motion.div>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Tags */}
                    {result.tags.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('results.tags')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {result.tags.map((tag) => (
                            <span key={tag} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                   {/* Recommended Actions */}
                   <div>
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('results.recommendedActions')}</h3>
                     <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-3">
                       {['verify', 'noClick', 'block'].map((actionKey) => (
                         <div key={actionKey} className="flex items-start">
                           <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                             <Check size={12} strokeWidth={3} />
                           </div>
                           <span className="text-gray-700 text-sm font-medium">{t(`results.actions.${actionKey}`)}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden p-6">
                <div className="mb-6 overflow-x-auto pb-2">
                  <div className="flex space-x-2">
                    {repliesData.categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat as ReplyCategory)}
                        data-testid={cat === 'bank' ? 'safe-reply-category-bank' : undefined}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                          selectedCategory === cat
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {t(`safeReply.categories.${cat}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  {(repliesData.templates[selectedCategory] as any)[locale]?.map((reply: string, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors group relative"
                    >
                       <p className="text-gray-700 pr-10 leading-relaxed">{reply}</p>
                       <button
                         onClick={() => copyToClipboard(reply, idx)}
                         className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
                         title={t('safeReply.copy')}
                       >
                         {copiedIndex === idx ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                       </button>
                    </motion.div>
                  ))}
                </div>

                {copiedIndex !== null && (
                   <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 z-50">
                     <Check size={16} />
                     <span className="text-sm font-medium">{t('safeReply.copied')}</span>
                   </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
