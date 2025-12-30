'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Zap,
  Link as LinkIcon,
  Info,
  History,
  Trash2,
  Share2,
  AlertCircle
} from 'lucide-react';
import { analyzeText, analyzeUrl, AnalysisResult } from '@/lib/rulesEngine';
import repliesData from '@/data/replies.json';
import { cn } from '@/lib/utils';
import { extractUrl, isValidUrl, getDomain, isIpAddress } from '@/lib/urlUtils';
import { getHistory, addToHistory, clearHistory, AnalysisHistoryItem } from '@/lib/history';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { Input } from './ui/Input';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Toast } from './ui/Toast';
import { Skeleton } from './ui/Skeleton';
import { Tooltip } from './ui/Tooltip';

interface ScamCheckerProps {
  locale: string;
}

type ReplyCategory = keyof typeof repliesData.templates;

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
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error' | 'default'} | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' | 'default' = 'default') => {
      setToastMessage({ message, type });
      setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDemo = () => {
    let demoText = '';
    if (locale === 'tr') {
      demoText = "Acil! Hesabınız askıya alındı. Hemen doğrulamak için tıklayın: http://banka-guvenlik-tr.com.tr.tc";
    } else if (locale === 'de') {
      demoText = "Dringend! Ihr Konto wurde gesperrt. Bestätigen Sie es sofort hier: http://secure-bank-de.xyz";
    } else {
      demoText = "Urgent! Your account has been suspended. Verify immediately at: http://secure-banking-alert.com";
    }
    setText(demoText);

    // Auto-fill URL if auto-detect is on
    const extracted = extractUrl(demoText);
    if (autoDetectUrl && extracted) {
      setUrl(extracted);
      setShowUrlInput(true);
    }
    setError(null);
    showToast(t('inputSection.demoLoaded') || "Demo loaded", 'default');
  };

  const handleAnalyze = async () => {
    if (!text && !url) return;

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    // Simulate reliable analysis time for UX
    await new Promise(resolve => setTimeout(resolve, 800));

    // Determine what to analyze
    let textResult = analyzeText(text, locale);
    let urlResult = { score: 0, reasons: [], tags: [] } as AnalysisResult;

    const urlToAnalyze = url || (autoDetectUrl ? extractUrl(text) : '');

    if (urlToAnalyze && !isValidUrl(urlToAnalyze)) {
         setIsAnalyzing(false);
         setError(t('inputSection.invalidUrl') || "Invalid URL provided.");
         return;
    }

    if (urlToAnalyze && isValidUrl(urlToAnalyze)) {
      urlResult = analyzeUrl(urlToAnalyze!);
    }

    // Combine results
    const finalScore = Math.max(textResult.score, urlResult.score);
    // Combine reasons but avoid duplicates if any (though IDs should be unique per source)
    const finalReasons = [...textResult.reasons, ...urlResult.reasons];
    const finalTags = Array.from(new Set([...textResult.tags, ...urlResult.tags]));

    const analysisResult = {
      score: finalScore,
      reasons: finalReasons,
      tags: finalTags
    };

    setResult(analysisResult);
    setIsAnalyzing(false);
    setActiveTab('results');

    // Add to history
    const historyItem: AnalysisHistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        score: finalScore,
        severity: finalScore < 30 ? 'low' : finalScore < 70 ? 'medium' : 'high',
        domain: urlToAnalyze ? getDomain(urlToAnalyze) : null,
        tags: finalTags
    };
    addToHistory(historyItem);
    setHistory(getHistory());

    // Auto-scroll to results
    setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Smart Safe Reply Suggestion
    // Simple heuristic: check tags for category keywords
    const lowerTags = finalTags.map(t => t.toLowerCase());
    if (lowerTags.includes('bank') || lowerTags.includes('financial_info') || lowerTags.includes('otp')) setSelectedCategory('bank');
    else if (lowerTags.includes('delivery') || lowerTags.includes('smishing')) setSelectedCategory('delivery');
    else if (lowerTags.includes('job_scam')) setSelectedCategory('job');
    else if (lowerTags.includes('romance_scam')) setSelectedCategory('romance');
    else if (lowerTags.includes('investment_scam') || lowerTags.includes('crypto_scam')) setSelectedCategory('investment');
    else if (lowerTags.includes('impersonation') || lowerTags.includes('support')) setSelectedCategory('support');

  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      const pastedText = e.clipboardData.getData('text');
      if (autoDetectUrl) {
          const extracted = extractUrl(pastedText);
          if (extracted && !url) {
              setUrl(extracted);
              setShowUrlInput(true);
          }
      }
  };

  // Effect for auto-detect when text changes (e.g. typing)
  useEffect(() => {
      if (autoDetectUrl && text && !url) {
          const extracted = extractUrl(text);
          if (extracted) {
              setUrl(extracted);
              setShowUrlInput(true);
          }
      }
  }, [text, autoDetectUrl, url]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast(t('safeReply.copied'), 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getSeverity = (score: number) => {
    if (score < 30) return { label: t('results.severity.low'), color: 'text-green-600 bg-green-50 border-green-200', icon: ShieldCheck };
    if (score < 70) return { label: t('results.severity.medium'), color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: AlertTriangle };
    return { label: t('results.severity.high'), color: 'text-red-600 bg-red-50 border-red-200', icon: ShieldAlert };
  };

  const shareResult = () => {
      if (!result) return;
      const severity = getSeverity(result.score).label;
      const shareText = `ScamCheck Report:\nRisk Score: ${result.score}/100 (${severity})\nTags: ${result.tags.join(', ')}\n\nCheck safely at scamcheck.vercel.app`;
      navigator.clipboard.writeText(shareText);
      showToast(t('results.shareCopied') || "Report summary copied!", 'success');
  };

  const clearLocalHistory = () => {
      clearHistory();
      setHistory([]);
      setHistoryOpen(false);
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-20 relative" data-testid="app-root">
      {toastMessage && (
          <Toast variant={toastMessage.type} data-testid={toastMessage.type === 'success' ? 'toast-success' : 'toast'}>
              {toastMessage.type === 'success' ? <Check size={16} /> : toastMessage.type === 'error' ? <AlertTriangle size={16}/> : <Info size={16}/>}
              <span>{toastMessage.message}</span>
          </Toast>
      )}

      {/* Header / History Toggle */}
      <div className="flex justify-end mb-4">
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(!historyOpen)} data-testid="recent-checks-button" className="text-slate-500">
                <History size={16} className="mr-2"/>
                {t('history.title') || "Recent Checks"}
            </Button>
            {historyOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-20 p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-sm">{t('history.title') || "Recent Checks"}</h4>
                        {history.length > 0 && (
                            <button onClick={clearLocalHistory} data-testid="clear-history" className="text-xs text-red-500 hover:text-red-700 flex items-center">
                                <Trash2 size={12} className="mr-1"/> {t('history.clear') || "Clear"}
                            </button>
                        )}
                    </div>
                    {history.length === 0 ? (
                        <p className="text-xs text-slate-400">{t('history.empty') || "No recent checks"}</p>
                    ) : (
                        <div className="space-y-2">
                            {history.map((item, idx) => (
                                <div key={item.id} data-testid={`recent-checks-item-${idx}`} className="text-xs border-b border-slate-50 pb-2 last:border-0">
                                    <div className="flex justify-between">
                                        <span className={cn(
                                            "font-bold",
                                            item.severity === 'high' ? "text-red-600" : item.severity === 'medium' ? "text-yellow-600" : "text-green-600"
                                        )}>Score: {item.score}</span>
                                        <span className="text-slate-400">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    {item.domain && <div className="text-slate-500 truncate">{item.domain}</div>}
                                    <div className="flex gap-1 mt-1 overflow-hidden">
                                        {item.tags.slice(0, 2).map(tag => (
                                            <span key={tag} className="bg-slate-100 px-1 rounded text-[10px] text-slate-600">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
          </div>
      </div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200"
      >
        <div className="relative">
          <Textarea
            data-testid="message-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={t('inputSection.placeholder')}
            className="w-full h-40 p-4 text-lg bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-100"
          />
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDemo}
              data-testid="demo-button"
              className="bg-white/80 backdrop-blur-sm"
            >
              {t('inputSection.demoButton')}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {error && (
            <div data-testid="error-inline" className="w-full p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium flex items-center border border-red-100 animate-pulse">
              <AlertTriangle size={16} className="mr-2" />
              {error}
            </div>
          )}

          <div className="flex items-center space-x-4 w-full sm:w-auto">
             <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  showUrlInput ? "text-blue-600 bg-blue-50" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <LinkIcon size={16} />
                <span>URL</span>
              </button>

              <div className="flex items-center space-x-2">
                 <label className="flex items-center space-x-2 text-sm text-slate-500 cursor-pointer select-none">
                  <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                    <input
                        type="checkbox"
                        name="toggle"
                        id="toggle"
                        data-testid="auto-detect-toggle"
                        checked={autoDetectUrl}
                        onChange={(e) => setAutoDetectUrl(e.target.checked)}
                        className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer left-1 top-1 peer-checked:translate-x-full peer-checked:border-blue-600"
                        style={{ right: 'unset' }}
                    />
                    <div className={cn("toggle-label block overflow-hidden h-6 rounded-full cursor-pointer", autoDetectUrl ? "bg-blue-600" : "bg-gray-300")}></div>
                  </div>
                  <span>{t('inputSection.autoDetectUrl')}</span>
                </label>
              </div>
          </div>
        </div>

        <AnimatePresence>
          {showUrlInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="relative">
                  <Input
                    data-testid="url-input"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('inputSection.urlPlaceholder')}
                    className="pl-10 bg-slate-50/50"
                  />
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16}/>

                  {/* URL Preview Badges */}
                  {url && isValidUrl(url) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                          <Badge variant="secondary" className="text-[10px] h-5">{getDomain(url)}</Badge>
                          {isIpAddress(url) && <Badge variant="destructive" className="text-[10px] h-5">IP</Badge>}
                      </div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleAnalyze}
          data-testid="analyze-button"
          disabled={isAnalyzing || (!text && !url)}
          size="lg"
          className="w-full mt-6 text-lg font-semibold shadow-blue-200"
        >
          {isAnalyzing ? (
            <>
               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
               <span>{t('inputSection.analyzing')}</span>
            </>
          ) : (
            <>
              <Zap size={20} className="fill-current mr-2" />
              <span>{t('inputSection.analyzeButton')}</span>
            </>
          )}
        </Button>

        <div className="mt-4 flex justify-center">
            <Tooltip content={t('privacy.note') || "Analysis happens on your device. No data is sent to servers."}>
                 <div className="flex items-center text-xs text-slate-400 cursor-help">
                     <ShieldCheck size={12} className="mr-1"/>
                     <span>{t('privacy.short') || "Client-side privacy secured"}</span>
                 </div>
            </Tooltip>
        </div>
      </motion.div>

      {/* Loading Skeleton */}
      {isAnalyzing && (
          <div className="space-y-4" data-testid="loading-skeleton">
              <Skeleton className="h-12 w-48 mx-auto rounded-xl"/>
              <Skeleton className="h-[400px] w-full rounded-2xl"/>
          </div>
      )}

      {/* Results Section */}
      <div ref={resultsRef}>
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
            <Tabs defaultValue="results" onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                <div className="flex justify-center mb-6">
                    <TabsList>
                        <TabsTrigger value="results" data-testid="results-tab">{t('safeReply.tabs.results')}</TabsTrigger>
                        <TabsTrigger value="safeReply" data-testid="safe-reply-tab">{t('safeReply.tabs.safeReply')}</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="results">
                   <Card className="border-slate-100 shadow-xl overflow-hidden">
                     <CardContent className="p-8">
                       <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                         <div className="flex items-center gap-6">
                           <div className="relative w-24 h-24 flex items-center justify-center">
                              {/* Simple CSS Ring */}
                              <svg className="w-full h-full transform -rotate-90">
                                <circle
                                  className="text-slate-100"
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
                              <span data-testid="score-value" className="absolute text-2xl font-bold text-slate-800">{result.score}</span>
                           </div>
                           <div>
                             <div className="flex items-center mb-1">
                                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold mr-2">{t('results.riskScore')}</span>
                                <Tooltip content={t('results.scoreTooltip') || "Calculated based on keywords, patterns, and URL analysis."}>
                                    <Info size={14} className="text-slate-400"/>
                                </Tooltip>
                             </div>
                             <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border", getSeverity(result.score).color)}>
                               {React.createElement(getSeverity(result.score).icon, { size: 16, className: "mr-2" })}
                               {getSeverity(result.score).label}
                             </div>
                           </div>
                         </div>

                         {/* Share/Action Buttons */}
                         <div className="flex gap-2">
                             <Button variant="outline" size="sm" onClick={shareResult} data-testid="report-copy-summary">
                                 <Share2 size={16} className="mr-2"/>
                                 {t('results.share') || "Share Report"}
                             </Button>
                         </div>
                       </div>

                       {/* Why Flagged */}
                       {result.reasons.length > 0 && (
                         <div className="mb-8" data-testid="reasons-list">
                           <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('results.whyFlagged')}</h3>
                           <div className="space-y-3">
                             {result.reasons.map((reason, idx) => (
                               <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-500 text-slate-700 text-sm flex items-start"
                               >
                                 <AlertCircle size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0"/>
                                 <span>{t(`rules.${reason}`) || reason}</span>
                                 {/* Fallback to reason string if key missing, assuming reason can be a key or text */}
                               </motion.div>
                             ))}
                           </div>
                         </div>
                       )}

                       {/* Tags */}
                        {result.tags.length > 0 && (
                          <div className="mb-8" data-testid="tags-list">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('results.tags')}</h3>
                            <div className="flex flex-wrap gap-2">
                              {result.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                       {/* Recommended Actions */}
                       <div data-testid="actions-checklist">
                         <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('results.recommendedActions')}</h3>
                         <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                           {['verify', 'noClick', 'block'].map((actionKey) => (
                             <div key={actionKey} className="flex items-start">
                               <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                                 <Check size={12} strokeWidth={3} />
                               </div>
                               <span className="text-slate-700 text-sm font-medium">{t(`results.actions.${actionKey}`)}</span>
                             </div>
                           ))}
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                </TabsContent>

                <TabsContent value="safeReply">
                  <Card className="border-slate-100 shadow-xl overflow-hidden">
                      <CardContent className="p-6">
                        <div className="mb-6 overflow-x-auto pb-2" data-testid="reply-category-select">
                          <div className="flex space-x-2">
                            {repliesData.categories.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat as ReplyCategory)}
                                data-testid={`reply-category-${cat}`}
                                className={cn(
                                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors relative",
                                  selectedCategory === cat
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                )}
                              >
                                {t(`safeReply.categories.${cat}`)}
                                {/* Show dot if suggested */}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-4">
                          {(repliesData.templates[selectedCategory] as any)[locale]?.map((reply: string, idx: number) => (
                            <motion.div
                              key={idx}
                              data-testid={`reply-template-${idx}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-slate-50 p-5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors group relative hover:shadow-sm"
                            >
                               <p className="text-slate-700 pr-10 leading-relaxed font-medium">{reply}</p>
                               <button
                                 onClick={() => copyToClipboard(reply, idx)}
                                 data-testid={`copy-reply-${idx}`}
                                 className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
                                 title={t('safeReply.copy')}
                               >
                                 {copiedIndex === idx ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                               </button>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                  </Card>
                </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
