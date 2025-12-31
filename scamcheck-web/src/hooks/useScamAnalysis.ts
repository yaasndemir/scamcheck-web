import { useState, useEffect } from 'react';
import { AnalysisResult, analyzeText, analyzeUrl } from '@/lib/rulesEngine';
import { extractAllUrls, isValidUrl } from '@/lib/urlUtils';
import { addToHistory, getHistory, AnalysisHistoryItem } from '@/lib/history';

interface UseScamAnalysisProps {
  initialText?: string;
  initialUrl?: string;
  autoDetectEnabled?: boolean;
  locale: string;
}

interface UseScamAnalysisReturn {
  text: string;
  setText: (text: string) => void;
  url: string;
  setUrl: (url: string) => void;
  detectedUrls: string[];
  selectedDetectedUrlIndex: number;
  setSelectedDetectedUrlIndex: (index: number) => void;
  showUrlInput: boolean;
  setShowUrlInput: (show: boolean) => void;
  autoDetectUrl: boolean;
  setAutoDetectUrl: (enabled: boolean) => void;
  manualUrlInput: boolean;
  setManualUrlInput: (manual: boolean) => void;
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement> | string) => void;
  handleUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAnalyze: () => Promise<void>;
  handleSelectDetectedUrl: (index: number) => void;
  handleClearUrl: () => void;
  resetAnalysis: () => void;
  history: AnalysisHistoryItem[];
  setHistory: (items: AnalysisHistoryItem[]) => void;
}

export function useScamAnalysis({
  initialText = '',
  initialUrl = '',
  autoDetectEnabled = true,
  locale
}: UseScamAnalysisProps): UseScamAnalysisReturn {
  // State
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);
  const [selectedDetectedUrlIndex, setSelectedDetectedUrlIndex] = useState(0);

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [autoDetectUrl, setAutoDetectUrl] = useState(autoDetectEnabled);
  const [manualUrlInput, setManualUrlInput] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // --- Logic Implementation ---

  // Reset Logic: When messageText changes, clear results
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement> | string) => {
    const newText = typeof e === 'string' ? e : e.target.value;

    setText(newText);
    setError(null);
    setResult(null); // Clear previous analysis immediately on change

    // Auto-Detect Logic
    const urls = extractAllUrls(newText);
    setDetectedUrls(urls);

    if (autoDetectUrl && !manualUrlInput) {
        if (urls.length > 0) {
            // Default to first URL
            setSelectedDetectedUrlIndex(0);
            setUrl(urls[0]);
            setShowUrlInput(true);
        } else {
            // Only clear if we are in auto mode and no manual override
            setUrl('');
        }
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
      setManualUrlInput(true); // Flag as manual override
      setError(null);
      setResult(null); // Clear result if URL changes
  };

  const handleSelectDetectedUrl = (index: number) => {
      if (index >= 0 && index < detectedUrls.length) {
          setSelectedDetectedUrlIndex(index);
          setUrl(detectedUrls[index]);
          // When selecting from detected, we treat it as part of auto-flow but specific selection
          // Important: We do NOT set manualUrlInput to true here, because we want it to update if text changes
          // UNLESS the requirement "Manual Override" strictly means "Any user interaction with URL".
          // The prompt says: "Kullanıcı manuel URL inputuna yazı yazarsa, isManualOverride flag'i true olmalı".
          // Selecting a detected URL is different from typing.
          setManualUrlInput(false);
          setResult(null); // Clear result on selection change
      }
  };

  const handleClearUrl = () => {
      setUrl('');
      setManualUrlInput(false);
      setResult(null);
      // If auto-detect is on, revert to auto-detected if available?
      if (autoDetectUrl) {
           const urls = extractAllUrls(text);
           if (urls.length > 0) {
               setUrl(urls[0]);
               setShowUrlInput(true);
           }
      }
  };

  const resetAnalysis = () => {
      setResult(null);
      setError(null);
  };

  const handleAnalyze = async () => {
    // Whitespace guard
    const isTextEmpty = !text || !text.trim();
    const isUrlEmpty = !url || !url.trim();

    if (isTextEmpty && isUrlEmpty) {
        setError("Please enter text or a URL."); // Should be localized in UI
        return;
    }

    setIsAnalyzing(true);
    setResult(null); // Leak Prevention: Clear previous data
    setError(null);

    // Simulate reliable analysis time for UX
    const delay = 600 + Math.random() * 600;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Determine what to analyze
    const textResult = analyzeText(text, locale);
    let urlResult = { score: 0, reasons: [], tags: [] } as AnalysisResult;

    const urlToAnalyze = url.trim();

    if (urlToAnalyze) {
        if (!isValidUrl(urlToAnalyze)) {
             setIsAnalyzing(false);
             setError("Invalid URL provided."); // Should be localized in UI
             return;
        }
        // Pass text for mismatch detection
        urlResult = analyzeUrl(urlToAnalyze, text);
    }

    // Combine results
    const finalScore = Math.max(textResult.score, urlResult.score);
    const finalReasons = Array.from(new Set([...textResult.reasons, ...urlResult.reasons]));
    const finalTags = Array.from(new Set([...textResult.tags, ...urlResult.tags]));

    const analysisResult = {
      score: finalScore,
      reasons: finalReasons,
      tags: finalTags,
      analyzedUrl: urlResult.analyzedUrl
    };

    setResult(analysisResult);
    setIsAnalyzing(false);

    // Add to history
    const historyItem: AnalysisHistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        score: finalScore,
        severity: finalScore < 30 ? 'low' : finalScore < 70 ? 'medium' : 'high',
        domain: urlToAnalyze ? (new URL(urlToAnalyze).hostname) : 'Text Only',
        tags: finalTags
    };
    addToHistory(historyItem);
    setHistory(getHistory());
  };

  return {
    text,
    setText,
    url,
    setUrl,
    detectedUrls,
    selectedDetectedUrlIndex,
    setSelectedDetectedUrlIndex,
    showUrlInput,
    setShowUrlInput,
    autoDetectUrl,
    setAutoDetectUrl,
    manualUrlInput,
    setManualUrlInput,
    isAnalyzing,
    result,
    error,
    handleTextChange,
    handleUrlChange,
    handleAnalyze,
    handleSelectDetectedUrl,
    handleClearUrl,
    resetAnalysis,
    history,
    setHistory
  };
}
