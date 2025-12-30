'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Image as ImageIcon,
  Search,
  Shield,
  Loader2
} from 'lucide-react';
import { analyzeText, analyzeUrl, AnalysisResult } from '@/lib/rulesEngine';
import repliesData from '@/data/replies.json';
import explanationsData from '@/data/explanations.json';
import { cn } from '@/lib/utils';
import { extractFirstUrl, isValidUrl, getDomain, isPunycode } from '@/lib/urlUtils';
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

// Helper to get explanation from local data
const getExplanation = (ruleId: string, locale: string): string => {
  const data = explanationsData as Record<string, Record<string, string>>;
  if (data[ruleId] && data[ruleId][locale]) {
    return data[ruleId][locale];
  }
  // Fallback to en if specific locale not found
  if (data[ruleId] && data[ruleId]['en']) {
    return data[ruleId]['en'];
  }
  return "";
};

export default function ScamChecker({ locale }: ScamCheckerProps) {
  const t = useTranslations('HomePage');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [autoDetectUrl, setAutoDetectUrl] = useState(true);
  const [manualUrlInput, setManualUrlInput] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'safeReply'>('results');
  const [selectedCategory, setSelectedCategory] = useState<ReplyCategory>('bank');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error' | 'default'} | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  const [ocrLoading, setOcrLoading] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setError(null);
    setManualUrlInput(false);

    // Auto-fill URL if auto-detect is on
    if (autoDetectUrl) {
      const extracted = extractFirstUrl(demoText);
      if (extracted) {
        setUrl(extracted);
        setShowUrlInput(true);
      } else {
        setUrl('');
      }
    }

    showToast(t('inputSection.demoLoaded') || "Demo loaded", 'default');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setError(null);

    // Auto-detect logic
    if (autoDetectUrl && !manualUrlInput) {
        const extracted = extractFirstUrl(newText);
        if (extracted) {
            setUrl(extracted);
            setShowUrlInput(true);
        } else {
            // Req: "URL bulunmadıysa: detected URL state’ini temizle."
            // Only if it was auto-detected. Since !manualUrlInput, we can clear it.
            setUrl('');
        }
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
      setManualUrlInput(true);
      setError(null);
  };

  const handleAutoDetectToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setAutoDetectUrl(checked);

      if (checked) {
          // If turned ON, run detection if not manual override
          if (!manualUrlInput) {
              const extracted = extractFirstUrl(text);
              if (extracted) {
                  setUrl(extracted);
                  setShowUrlInput(true);
              } else {
                  setUrl('');
              }
          }
      } else {
          // If turned OFF, do not clear URL, just stop updating.
          // Req: "detected URL gösterme" -> this might mean clear it if it was detected?
          // Req: "message’ten URL çekme yapma. (Mevcut URL input değerine dokunma.)"
          // So we do nothing to the current value.
      }
  };

  const handleClearUrl = () => {
      setUrl('');
      setManualUrlInput(false);
      // Req: "URL input’ta “Clear” butonuna basılırsa manual=false ve (autoDetect açıksa) tekrar message’ten algılamaya dön."
      if (autoDetectUrl) {
          const extracted = extractFirstUrl(text);
          if (extracted) {
              setUrl(extracted);
              // Ensure it shows up
              setShowUrlInput(true);
          }
      }
  };

  const handleAnalyze = async () => {
    // Whitespace guard - Ensure no empty input is processed
    const isTextEmpty = !text || !text.trim();
    const isUrlEmpty = !url || !url.trim();

    if (isTextEmpty && isUrlEmpty) {
        setError(t('inputSection.errorEmpty') || "Please enter text or a URL.");
        return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    // Simulate reliable analysis time for UX (Progressive Loading)
    // 600-1200ms
    const delay = 600 + Math.random() * 600;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Determine what to analyze
    const textResult = analyzeText(text, locale);
    let urlResult = { score: 0, reasons: [], tags: [] } as AnalysisResult;

    // Use URL input first, if available.
    // If URL input is empty (even if manually cleared), and auto-detect found nothing, we analyze empty string (safe).
    const urlToAnalyze = url.trim();

    if (urlToAnalyze && !isValidUrl(urlToAnalyze)) {
         setIsAnalyzing(false);
         setError(t('inputSection.invalidUrl') || "Invalid URL provided.");
         return;
    }

    if (urlToAnalyze && isValidUrl(urlToAnalyze)) {
      // Pass text for mismatch detection
      urlResult = analyzeUrl(urlToAnalyze, text);
    }

    // Combine results
    const finalScore = Math.max(textResult.score, urlResult.score);
    // Combine reasons but avoid duplicates
    const finalReasons = Array.from(new Set([...textResult.reasons, ...urlResult.reasons]));
    const finalTags = Array.from(new Set([...textResult.tags, ...urlResult.tags]));

    const analysisResult = {
      score: finalScore,
      reasons: finalReasons,
      tags: finalTags,
      analyzedUrl: urlResult.analyzedUrl || urlToAnalyze
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
    const lowerTags = finalTags.map(t => t.toLowerCase());
    if (lowerTags.includes('bank') || lowerTags.includes('financial_info') || lowerTags.includes('otp')) setSelectedCategory('bank');
    else if (lowerTags.includes('delivery') || lowerTags.includes('smishing')) setSelectedCategory('delivery');
    else if (lowerTags.includes('job_scam')) setSelectedCategory('job');
    else if (lowerTags.includes('romance_scam')) setSelectedCategory('romance');
    else if (lowerTags.includes('investment_scam') || lowerTags.includes('crypto_scam')) setSelectedCategory('investment');
    else if (lowerTags.includes('impersonation') || lowerTags.includes('support')) setSelectedCategory('support');

  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only analyze on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const handlePaste = () => {
      // Standard paste handling is done by onChange,
      // but if we wanted to intercept specifically we could.
      // We rely on onChange for auto-detection logic as it covers typing too.
  };

  const handleOCRFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate
      if (file.size > 5 * 1024 * 1024) { // 5MB
          showToast(t('inputSection.ocrTooBig') || "Image too large (max 5MB)", 'error');
          return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          showToast(t('inputSection.ocrInvalidType') || "Invalid image type", 'error');
          return;
      }

      setOcrLoading(true);
      try {
          const Tesseract = (await import('tesseract.js')).default;
          const { data: { text: extractedText } } = await Tesseract.recognize(
              file,
              locale === 'tr' ? 'tur' : locale === 'de' ? 'deu' : 'eng',
              {
                  // logger: m => { /* Progress logger if needed */ }
              }
          );

          setText(extractedText);
          setError(null);

          // Trigger auto-detect logic manually since we set state directly
          if (autoDetectUrl && !manualUrlInput) {
              const extracted = extractFirstUrl(extractedText);
              if (extracted) {
                  setUrl(extracted);
                  setShowUrlInput(true);
              } else {
                  setUrl('');
              }
          }

          showToast(t('inputSection.ocrSuccess') || "Text extracted from image", 'success');
      } catch (err) {
          console.error(err);
          showToast(t('inputSection.ocrError') || "Failed to extract text", 'error');
      } finally {
          setOcrLoading(false);
          // Reset file input
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast(t('safeReply.copied'), 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getSeverity = (score: number) => {
    if (score < 30) return { label: t('results.severity.low'), color: 'text-green-700 bg-green-50 border-green-200', icon: ShieldCheck };
    if (score < 70) return { label: t('results.severity.medium'), color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle };
    return { label: t('results.severity.high'), color: 'text-red-700 bg-red-50 border-red-200', icon: ShieldAlert };
  };

  // const getReasonIcon = (score: number) => {
  //     if (score < 30) return { icon: Info, color: "text-blue-500" };
  //     if (score < 70) return { icon: AlertTriangle, color: "text-amber-500" };
  //     return { icon: ShieldAlert, color: "text-red-600" };
  // }

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

  const restoreHistoryItem = (item: AnalysisHistoryItem) => {
      // Restore isn't full restore because we don't save full text/url content for privacy
      // But we can show what we have
      showToast(t('history.restoreNote') || "Privacy: Only metadata is saved, content cannot be restored.", 'default');
      console.log(item); // Suppress lint
  }

  // Prepare URL badge info
  const domainForBadge = url ? getDomain(url) : null;
  const isPuny = domainForBadge ? isPunycode(domainForBadge) : false;

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
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(!historyOpen)} data-testid="recent-checks-button" className="text-slate-600 hover:text-slate-800">
                <History size={16} className="mr-2"/>
                {t('history.title') || "Recent Checks"}
            </Button>
            {historyOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700 z-50 p-4 text-slate-100">
                    <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                        <h4 className="font-semibold text-sm text-slate-100">{t('history.title') || "Recent Checks"}</h4>
                        {history.length > 0 && (
                            <button onClick={clearLocalHistory} data-testid="clear-history" className="text-xs text-red-400 hover:text-red-300 flex items-center transition-colors">
                                <Trash2 size={12} className="mr-1"/> {t('history.clear') || "Clear"}
                            </button>
                        )}
                    </div>
                    {history.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">{t('history.empty') || "No recent checks"}</p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {history.map((item, idx) => (
                                <div key={item.id}
                                     data-testid={`recent-checks-item-${idx}`}
                                     className="group p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                                     onClick={() => restoreHistoryItem(item)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] px-1 py-0 h-5",
                                            item.severity === 'high' ? "text-red-400 border-red-900 bg-red-900/20" :
                                            item.severity === 'medium' ? "text-amber-400 border-amber-900 bg-amber-900/20" :
                                            "text-green-400 border-green-900 bg-green-900/20"
                                        )}>Score: {item.score}</Badge>
                                        <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    {item.domain && <div className="text-xs text-slate-300 truncate font-mono mb-1">{item.domain}</div>}
                                    <div className="flex gap-1 overflow-hidden">
                                        {item.tags.slice(0, 2).map(tag => (
                                            <span key={tag} className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">{tag}</span>
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
        className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 mb-8 border border-slate-100"
      >
        <div className="relative">
          <Textarea
            data-testid="message-input"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={t('inputSection.placeholder')}
            className="w-full h-40 p-4 text-lg bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all resize-y text-slate-800 placeholder:text-slate-400"
          />

          <div className="absolute bottom-4 right-4 flex space-x-2">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleOCRFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
             />
             <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
              className="bg-white/90 backdrop-blur-sm border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-sm"
              title="Scan Image (OCR)"
            >
              {ocrLoading ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14} />}
              <span className="ml-2 hidden sm:inline">Scan Img</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDemo}
              data-testid="demo-button"
              className="bg-white/90 backdrop-blur-sm border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-sm"
            >
              {t('inputSection.demoButton')}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {error && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                data-testid="error-inline"
                className="w-full sm:w-auto flex-1 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium flex items-center border border-red-100"
            >
              <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <div className="flex items-center space-x-4 w-full sm:w-auto ml-auto">
             <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-200",
                  showUrlInput ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <LinkIcon size={16} />
                <span>URL</span>
              </button>

              <div className="flex items-center space-x-2">
                 <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer select-none group">
                  <div className="relative inline-block w-9 h-5 align-middle select-none transition duration-200 ease-in">
                    <input
                        type="checkbox"
                        name="toggle"
                        id="toggle"
                        data-testid="auto-detect-toggle"
                        checked={autoDetectUrl}
                        onChange={handleAutoDetectToggle}
                        className="toggle-checkbox absolute block w-3 h-3 rounded-full bg-white border-none appearance-none cursor-pointer left-1 top-1 peer-checked:translate-x-full shadow-sm"
                        style={{ right: 'unset' }}
                    />
                    <div className={cn("toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors", autoDetectUrl ? "bg-blue-600" : "bg-slate-200 group-hover:bg-slate-300")}></div>
                  </div>
                  <span className="font-medium">{t('inputSection.autoDetectUrl')}</span>
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
              className="overflow-visible mt-3"
            >
              <div className="relative group">
                  <Input
                    data-testid="url-input"
                    type="text"
                    value={url}
                    onChange={handleUrlChange}
                    placeholder={t('inputSection.urlPlaceholder')}
                    className="pl-10 pr-24 bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all font-mono text-sm text-slate-700"
                  />
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16}/>

                  {/* Clear Button */}
                  {url && (
                       <button
                         onClick={handleClearUrl}
                         className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
                         title="Clear URL"
                       >
                           <Trash2 size={12}/>
                       </button>
                  )}

                  {/* URL Preview Badges - positioned above or right */}
                  {url && isValidUrl(url) && (
                      <div className="absolute right-10 top-1/2 transform -translate-y-1/2 flex gap-1 pointer-events-none">
                           {isPuny && (
                                <Tooltip content="Punycode Detected (Possible Spoofing)">
                                    <Badge variant="destructive" className="text-[9px] h-5 px-1 bg-red-100 text-red-700 border-red-200 hover:bg-red-200">IDN</Badge>
                                </Tooltip>
                           )}
                           <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-200 text-slate-700 border-slate-300 shadow-sm opacity-90">
                               {domainForBadge}
                           </Badge>
                      </div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleAnalyze}
          data-testid="analyze-button"
          disabled={isAnalyzing || ((!text || !text.trim()) && (!url || !url.trim()))}
          aria-disabled={isAnalyzing || ((!text || !text.trim()) && (!url || !url.trim()))}
          size="lg"
          className="w-full mt-6 text-lg font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.99]"
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
                 <div className="flex items-center text-xs text-slate-400 cursor-help hover:text-slate-500 transition-colors">
                     <ShieldCheck size={12} className="mr-1.5"/>
                     <span>{t('privacy.short') || "Client-side privacy secured"}</span>
                 </div>
            </Tooltip>
        </div>
      </motion.div>

      {/* Loading Skeleton */}
      {isAnalyzing && (
          <div className="space-y-6" data-testid="loading-skeleton">
             <div className="flex justify-center">
                  <Skeleton className="h-10 w-64 rounded-full"/>
             </div>
             <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-xl space-y-6">
                 <div className="flex items-center gap-6">
                     <Skeleton className="h-24 w-24 rounded-full"/>
                     <div className="space-y-2 flex-1">
                         <Skeleton className="h-6 w-32"/>
                         <Skeleton className="h-8 w-48"/>
                     </div>
                 </div>
                 <div className="space-y-3">
                     <Skeleton className="h-16 w-full rounded-xl"/>
                     <Skeleton className="h-16 w-full rounded-xl"/>
                 </div>
             </div>
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
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Tabs defaultValue="results" onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                <div className="flex justify-center mb-6">
                    <TabsList className="bg-white p-1 shadow-sm border border-slate-200 rounded-full">
                        <TabsTrigger value="results" data-testid="results-tab" className="rounded-full px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            {t('safeReply.tabs.results')}
                        </TabsTrigger>
                        <TabsTrigger value="safeReply" data-testid="safe-reply-tab" className="rounded-full px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            {t('safeReply.tabs.safeReply')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="results">
                   <Card className="border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-100">
                     <CardContent className="p-0">

                       {/* Result Header */}
                       <div className="p-8 pb-6">
                           <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                             <div className="flex items-center gap-6">
                               <div className="relative w-28 h-28 flex items-center justify-center">
                                  {/* Animated Score Ring */}
                                  <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                      className="text-slate-100"
                                      strokeWidth="8"
                                      stroke="currentColor"
                                      fill="transparent"
                                      r="46"
                                      cx="56"
                                      cy="56"
                                    />
                                    <motion.circle
                                      className={cn(
                                        result.score < 30 ? "text-green-500" : result.score < 70 ? "text-amber-500" : "text-red-500"
                                      )}
                                      strokeWidth="8"
                                      strokeDasharray={289}
                                      strokeDashoffset={289}
                                      animate={{ strokeDashoffset: 289 - (289 * result.score) / 100 }}
                                      transition={{ duration: 1, ease: "easeOut" }}
                                      strokeLinecap="round"
                                      stroke="currentColor"
                                      fill="transparent"
                                      r="46"
                                      cx="56"
                                      cy="56"
                                    />
                                  </svg>
                                  <div className="absolute flex flex-col items-center">
                                      <span data-testid="score-value" className="text-3xl font-bold text-slate-800">{result.score}</span>
                                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Risk</span>
                                  </div>
                               </div>

                               <div>
                                 <div className="flex items-center mb-2">
                                    <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border shadow-sm", getSeverity(result.score).color)}>
                                       {React.createElement(getSeverity(result.score).icon, { size: 16, className: "mr-2" })}
                                       {getSeverity(result.score).label}
                                    </div>
                                 </div>
                                 <div className="flex items-center text-slate-500 text-sm">
                                    <Shield size={14} className="mr-1.5"/>
                                    <span>{t('results.riskScore')}</span>
                                    <Tooltip content={t('results.scoreTooltip')}>
                                        <Info size={14} className="ml-1.5 text-slate-300 hover:text-slate-500 cursor-help transition-colors"/>
                                    </Tooltip>
                                 </div>
                                 {result.analyzedUrl && result.analyzedUrl !== url && (
                                     <div className="mt-2 text-xs text-slate-500 flex items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                         <Search size={12} className="mr-1 text-blue-400"/>
                                         Expanded: <span className="font-mono ml-1 max-w-[150px] truncate">{result.analyzedUrl}</span>
                                     </div>
                                 )}
                               </div>
                             </div>

                             {/* Share/Action Buttons */}
                             <div className="flex gap-2">
                                 <Button variant="outline" size="sm" onClick={shareResult} data-testid="report-copy-summary" className="border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                                     <Share2 size={16} className="mr-2"/>
                                     {t('results.share') || "Share Report"}
                                 </Button>
                             </div>
                           </div>
                       </div>

                       <div className="h-px bg-slate-100 w-full"></div>

                       {/* Analysis Content */}
                       <div className="p-8 pt-6 space-y-8">
                           {/* Why Flagged */}
                           {result.reasons.length > 0 && (
                             <div className="" data-testid="reasons-list">
                               <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                                   {t('results.whyFlagged')}
                               </h3>
                               <div className="space-y-3">
                                 {result.reasons.map((reason, idx) => {
                                   // const severityIcon = getReasonIcon(result.score);
                                   const reasonText = t(`rules.${reason}`) !== `rules.${reason}` ? t(`rules.${reason}`) : reason.replace(/_/g, ' ');
                                   const explanation = getExplanation(reason, locale);

                                   return (
                                     <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="group bg-white p-4 rounded-xl border border-slate-100 hover:border-blue-200 shadow-sm transition-all flex items-start"
                                     >
                                       <div className={cn("p-2 rounded-lg mr-4 bg-opacity-10",
                                            result.score > 70 ? "bg-red-50 text-red-600" : result.score > 30 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                       )}>
                                            <AlertCircle size={20} />
                                       </div>
                                       <div className="flex-1">
                                            <div className="font-semibold text-slate-700">{reasonText}</div>
                                            {explanation && <div className="text-xs text-slate-500 mt-1">{explanation}</div>}
                                       </div>
                                     </motion.div>
                                   );
                                 })}
                               </div>
                             </div>
                           )}

                           {/* Tags */}
                            {result.tags.length > 0 && (
                              <div className="" data-testid="tags-list">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('results.tags')}</h3>
                                <div className="flex flex-wrap gap-2">
                                  {result.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 px-3 py-1">
                                      #{tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                           {/* Recommended Actions */}
                           <div data-testid="actions-checklist">
                             <h3 className="text-lg font-bold text-slate-800 mb-4">{t('results.recommendedActions')}</h3>
                             <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 space-y-4">
                               {['verify', 'noClick', 'block'].map((actionKey) => (
                                 <div key={actionKey} className="flex items-start">
                                   <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 shadow-sm border border-green-200">
                                     <Check size={14} strokeWidth={3} />
                                   </div>
                                   <span className="text-slate-700 font-medium py-0.5">{t(`results.actions.${actionKey}`)}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                       </div>
                     </CardContent>
                   </Card>
                </TabsContent>

                <TabsContent value="safeReply">
                  <Card className="border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-100">
                      <CardContent className="p-0">
                        {/* Category Selector */}
                        <div className="bg-slate-50/50 border-b border-slate-100 p-4 overflow-x-auto" data-testid="reply-category-select">
                          <div className="flex space-x-2">
                            {repliesData.categories.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat as ReplyCategory)}
                                data-testid={`reply-category-${cat}`}
                                className={cn(
                                  "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all relative outline-none focus:ring-2 focus:ring-blue-200",
                                  selectedCategory === cat
                                    ? "bg-white text-blue-700 shadow-md border border-blue-100 ring-1 ring-blue-50"
                                    : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                )}
                              >
                                {t(`safeReply.categories.${cat}`)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Templates List */}
                        <div className="p-6 grid gap-4">
                          {(repliesData.templates[selectedCategory] as any)[locale]?.map((reply: string, idx: number) => (
                            <motion.div
                              key={idx}
                              data-testid={`reply-template-${idx}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group bg-white p-5 rounded-xl border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all relative"
                            >
                               <div className="pr-12">
                                   <p className="text-slate-700 leading-relaxed font-medium">{reply}</p>
                                   <div className="flex gap-2 mt-3">
                                       <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Neutral</span>
                                   </div>
                               </div>
                               <button
                                 onClick={() => copyToClipboard(reply, idx)}
                                 data-testid={`copy-reply-${idx}`}
                                 className={cn(
                                     "absolute top-4 right-4 transition-all p-2 rounded-lg",
                                     copiedIndex === idx ? "bg-green-50 text-green-600" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                 )}
                                 title={t('safeReply.copy')}
                               >
                                 {copiedIndex === idx ? <Check size={20} /> : <Copy size={20} />}
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
