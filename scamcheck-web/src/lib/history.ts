export interface AnalysisHistoryItem {
    id: string;
    timestamp: number;
    score: number;
    severity: 'low' | 'medium' | 'high';
    domain?: string | null;
    tags: string[];
}

const HISTORY_KEY = 'scamcheck_history';
const MAX_HISTORY_ITEMS = 5;

export const getHistory = (): AnalysisHistoryItem[] => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const addToHistory = (item: AnalysisHistoryItem) => {
    if (typeof window === 'undefined') return;
    try {
        const history = getHistory();
        // Avoid duplicates if exactly same score/timestamp (unlikely but good safety)
        // Better: just prepend and slice
        const newHistory = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
        console.error("Failed to save history", e);
    }
};

export const clearHistory = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(HISTORY_KEY);
};

export const getSeverityLabel = (score: number): 'low' | 'medium' | 'high' => {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    return 'high';
};
