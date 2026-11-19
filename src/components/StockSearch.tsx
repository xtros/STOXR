import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, TrendingUp, TrendingDown, Sparkles, Building2, Flame } from 'lucide-react';
import { toast } from 'sonner';
import sampleData from '@/data/sampleData.json';
import { cn } from '@/lib/utils';

interface StockSearchProps {
    onStockFound: (stockCode: string, stockData?: any) => void;
    className?: string;
}

interface StockMetadata {
    name: string;
    exchange: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE' | 'GLOBAL';
    sector: string;
}

const STOCK_DIRECTORY: Record<string, StockMetadata> = {
    RELIANCE: { name: 'Reliance Industries', exchange: 'NSE', sector: 'Energy & Retail' },
    TCS: { name: 'Tata Consultancy Services', exchange: 'NSE', sector: 'IT Services' },
    HDFCBANK: { name: 'HDFC Bank', exchange: 'NSE', sector: 'Banking & Financials' },
    INFY: { name: 'Infosys Limited', exchange: 'NSE', sector: 'IT Services & AI' },
    ICICIBANK: { name: 'ICICI Bank', exchange: 'NSE', sector: 'Banking & Financials' },
    TATAMOTORS: { name: 'Tata Motors', exchange: 'NSE', sector: 'Automotive & EV' },
    BHARTIARTL: { name: 'Bharti Airtel', exchange: 'NSE', sector: 'Telecommunications' },
    SBIN: { name: 'State Bank of India', exchange: 'NSE', sector: 'Public Sector Banking' },
    ITC: { name: 'ITC Limited', exchange: 'NSE', sector: 'FMCG & Consumer Goods' },
    BAJFINANCE: { name: 'Bajaj Finance', exchange: 'NSE', sector: 'Financial Services' },
    LT: { name: 'Larsen & Toubro', exchange: 'NSE', sector: 'Engineering & Infra' },
    WIPRO: { name: 'Wipro Limited', exchange: 'NSE', sector: 'IT Services' },
    MARUTI: { name: 'Maruti Suzuki India', exchange: 'NSE', sector: 'Automobile Manufacturing' },
    TITAN: { name: 'Titan Company', exchange: 'NSE', sector: 'Luxury & Consumer Retail' },
    ZOMATO: { name: 'Zomato (Eternal)', exchange: 'NSE', sector: 'Consumer Tech & Delivery' },
    AAPL: { name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Consumer Electronics' },
    ADBE: { name: 'Adobe Inc.', exchange: 'NASDAQ', sector: 'Creative Software & Cloud' },
    AMD: { name: 'Advanced Micro Devices', exchange: 'NASDAQ', sector: 'Semiconductors & AI' },
    AMZN: { name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'E-Commerce & Cloud' },
    BABA: { name: 'Alibaba Group', exchange: 'NYSE', sector: 'E-Commerce & Internet' },
    CRM: { name: 'Salesforce Inc.', exchange: 'NYSE', sector: 'Enterprise CRM & SaaS' },
    CSCO: { name: 'Cisco Systems', exchange: 'NASDAQ', sector: 'Networking & Hardware' },
    DIS: { name: 'The Walt Disney Company', exchange: 'NYSE', sector: 'Entertainment & Media' },
    DOCU: { name: 'DocuSign Inc.', exchange: 'NASDAQ', sector: 'Cloud Software' },
    GOOGL: { name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ', sector: 'Internet Services & AI' },
    INTC: { name: 'Intel Corporation', exchange: 'NASDAQ', sector: 'Semiconductor Manufacturing' },
    JPM: { name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Investment Banking' },
    META: { name: 'Meta Platforms', exchange: 'NASDAQ', sector: 'Social Media & AI' },
    MSFT: { name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Cloud, Software & AI' },
    NFLX: { name: 'Netflix Inc.', exchange: 'NASDAQ', sector: 'Streaming Entertainment' },
    NVDA: { name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'AI Semiconductors & GPU' },
    ORCL: { name: 'Oracle Corporation', exchange: 'NYSE', sector: 'Enterprise Cloud' },
    PINS: { name: 'Pinterest Inc.', exchange: 'NYSE', sector: 'Social Media' },
    PYPL: { name: 'PayPal Holdings', exchange: 'NASDAQ', sector: 'Fintech & Payments' },
    ROKU: { name: 'Roku Inc.', exchange: 'NASDAQ', sector: 'Streaming Devices & Media' },
    SHOP: { name: 'Shopify Inc.', exchange: 'NYSE', sector: 'E-Commerce Platforms' },
    SNAP: { name: 'Snap Inc.', exchange: 'NYSE', sector: 'Social Media & Camera' },
    SQ: { name: 'Block Inc. (Square)', exchange: 'NYSE', sector: 'Fintech & Payments' },
    TWTR: { name: 'Twitter (X Corp)', exchange: 'GLOBAL', sector: 'Digital Media & Social' },
    UBER: { name: 'Uber Technologies', exchange: 'NYSE', sector: 'Mobility & Delivery' },
    V: { name: 'Visa Inc.', exchange: 'NYSE', sector: 'Global Payment Network' },
    ZM: { name: 'Zoom Video', exchange: 'NASDAQ', sector: 'Enterprise Communications' },
};

const POPULAR_TICKERS = ['RELIANCE', 'TCS', 'ICICIBANK', 'AAPL', 'NVDA', 'ZOMATO'];

export const StockSearch: React.FC<StockSearchProps> = ({ onStockFound, className }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter matching stocks with ranking
    const matches = useMemo(() => {
        const trimmed = searchQuery.trim().toLowerCase();
        if (!trimmed) return [];

        return sampleData.signals
            .map((stock) => {
                const meta = STOCK_DIRECTORY[stock.asset] || {
                    name: stock.asset,
                    exchange: 'GLOBAL' as const,
                    sector: 'Equities'
                };
                const assetLower = stock.asset.toLowerCase();
                const nameLower = meta.name.toLowerCase();
                const sectorLower = meta.sector.toLowerCase();
                const descLower = stock.description?.toLowerCase() || '';

                let score = 0;
                if (assetLower === trimmed) score = 100;
                else if (assetLower.startsWith(trimmed)) score = 80;
                else if (nameLower.startsWith(trimmed)) score = 60;
                else if (assetLower.includes(trimmed)) score = 50;
                else if (nameLower.includes(trimmed)) score = 40;
                else if (sectorLower.includes(trimmed)) score = 30;
                else if (descLower.includes(trimmed)) score = 10;

                return { stock, meta, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 7);
    }, [searchQuery]);

    // Popular suggestions when query is empty but focused
    const popularMatches = useMemo(() => {
        return sampleData.signals
            .filter((s) => POPULAR_TICKERS.includes(s.asset))
            .map((stock) => ({
                stock,
                meta: STOCK_DIRECTORY[stock.asset] || {
                    name: stock.asset,
                    exchange: 'GLOBAL' as const,
                    sector: 'Equities'
                }
            }));
    }, []);

    const handleSelect = (stock: any, meta: StockMetadata) => {
        onStockFound(stock.asset, stock);
        toast.success(`Selected ${stock.asset} • ${meta.name}`);
        setSearchQuery('');
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const currentList = searchQuery.trim() ? matches : popularMatches;
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % currentList.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev - 1 + currentList.length) % currentList.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < currentList.length) {
                const item = currentList[highlightedIndex];
                handleSelect(item.stock, item.meta);
            } else if (matches.length > 0) {
                handleSelect(matches[0].stock, matches[0].meta);
            } else if (searchQuery.trim()) {
                handleRawSubmit(searchQuery.trim());
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setHighlightedIndex(-1);
            inputRef.current?.blur();
        }
    };

    const handleRawSubmit = async (query: string) => {
        setLoading(true);
        const localMatch = sampleData.signals.find(s =>
            s.asset.toUpperCase() === query.toUpperCase() ||
            s.asset.toUpperCase().includes(query.toUpperCase())
        );

        if (localMatch) {
            handleSelect(localMatch, STOCK_DIRECTORY[localMatch.asset] || {
                name: localMatch.asset,
                exchange: 'GLOBAL',
                sector: 'Equities'
            });
            setLoading(false);
            return;
        }

        try {
            const isStockCode = /^[A-Z]{1,12}(\.NS|\.BO)?$/i.test(query);
            let stockCode: string = query.toUpperCase();
            let stockData: any = null;

            if (isStockCode) {
                try {
                    const response = await fetch(`http://localhost:5000/api/stock/${stockCode}`);
                    if (response.ok) {
                        stockData = await response.json();
                    }
                } catch {
                    // Backend offline
                }
            }

            if (stockData) {
                onStockFound(stockCode, stockData);
                toast.success(`Found stock: ${stockCode}`);
                setSearchQuery('');
                setIsOpen(false);
                return;
            }

            toast.error(`Stock "${query}" not found`);
        } catch {
            toast.error('Search failed, please try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={containerRef} className={cn('relative w-full sm:w-80 md:w-96', className)}>
            {/* Input Bar */}
            <div className="relative flex items-center">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search stock code or company (e.g. RELIANCE, TCS, AAPL)..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                        setHighlightedIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-9 py-2.5 bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-900 text-white placeholder-zinc-500 text-xs sm:text-sm font-medium rounded-2xl border border-zinc-800 focus:border-zinc-500 focus:outline-none transition-all duration-200 shadow-sm"
                    maxLength={50}
                />

                {/* Clear Button / Spinner */}
                {loading ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
                    </div>
                ) : searchQuery ? (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery('');
                            setHighlightedIndex(-1);
                            inputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
                        title="Clear search"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                ) : null}
            </div>

            {/* Autocomplete Dropdown */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-[#0c0c0e]/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl shadow-black/90 p-1.5 z-[100] max-h-96 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-150">
                    {searchQuery.trim() ? (
                        matches.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                                    Matching Equities ({matches.length})
                                </div>
                                {matches.map(({ stock, meta }, idx) => {
                                    const isHighlighted = idx === highlightedIndex;
                                    const isPositive = (stock.change ?? 0) >= 0;
                                    return (
                                        <button
                                            key={stock.id || stock.asset}
                                            type="button"
                                            onClick={() => handleSelect(stock, meta)}
                                            onMouseEnter={() => setHighlightedIndex(idx)}
                                            className={cn(
                                                'w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group',
                                                isHighlighted
                                                    ? 'bg-zinc-800/90 text-white'
                                                    : 'hover:bg-zinc-900/80 text-zinc-300'
                                            )}
                                        >
                                            {/* Left: Avatar + Names */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-xs text-white flex-shrink-0 group-hover:border-zinc-500 transition-colors">
                                                    {stock.asset.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white text-xs sm:text-sm tracking-tight truncate">
                                                            {stock.asset}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium">
                                                            {meta.exchange}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-zinc-400 truncate">
                                                        {meta.name} • <span className="text-zinc-500">{meta.sector}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Price + Change + Signal */}
                                            <div className="flex items-center gap-2.5 flex-shrink-0 text-right ml-3">
                                                <div>
                                                    <div className="text-xs font-semibold text-white">
                                                        {typeof stock.price === 'number'
                                                            ? (meta.exchange === 'NSE' || meta.exchange === 'BSE' ? `₹${stock.price.toFixed(2)}` : `$${stock.price.toFixed(2)}`)
                                                            : stock.price}
                                                    </div>
                                                    {stock.change !== undefined && (
                                                        <div
                                                            className={cn(
                                                                'text-[10px] font-semibold flex items-center justify-end gap-0.5',
                                                                isPositive ? 'text-emerald-400' : 'text-rose-400'
                                                            )}
                                                        >
                                                            {isPositive ? (
                                                                <TrendingUp className="w-2.5 h-2.5" />
                                                            ) : (
                                                                <TrendingDown className="w-2.5 h-2.5" />
                                                            )}
                                                            {isPositive ? `+${stock.change}%` : `${stock.change}%`}
                                                        </div>
                                                    )}
                                                </div>

                                                <span
                                                    className={cn(
                                                        'text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase',
                                                        stock.type === 'BUY'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : stock.type === 'SELL'
                                                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                                    )}
                                                >
                                                    {stock.type}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 text-center">
                                <Building2 className="w-7 h-7 mx-auto text-zinc-600 mb-1.5" />
                                <div className="text-xs font-medium text-zinc-300">
                                    No stocks found for "{searchQuery}"
                                </div>
                                <div className="text-[11px] text-zinc-500 mt-0.5">
                                    Try searching by symbol (e.g. RELIANCE, AAPL) or sector (e.g. Banking, Tech)
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col gap-1">
                            <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                                <Flame className="w-3 h-3 text-orange-400" />
                                Popular Equities
                            </div>
                            {popularMatches.map(({ stock, meta }, idx) => {
                                const isHighlighted = idx === highlightedIndex;
                                const isPositive = (stock.change ?? 0) >= 0;
                                return (
                                    <button
                                        key={stock.id || stock.asset}
                                        type="button"
                                        onClick={() => handleSelect(stock, meta)}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        className={cn(
                                            'w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group',
                                            isHighlighted
                                                ? 'bg-zinc-800/90 text-white'
                                                : 'hover:bg-zinc-900/80 text-zinc-300'
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-xs text-white flex-shrink-0 group-hover:border-zinc-500 transition-colors">
                                                {stock.asset.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-xs sm:text-sm tracking-tight truncate">
                                                        {stock.asset}
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium">
                                                        {meta.exchange}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-zinc-400 truncate">
                                                    {meta.name} • <span className="text-zinc-500">{meta.sector}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 flex-shrink-0 text-right ml-3">
                                            <div>
                                                <div className="text-xs font-semibold text-white">
                                                    {typeof stock.price === 'number'
                                                        ? (meta.exchange === 'NSE' || meta.exchange === 'BSE' ? `₹${stock.price.toFixed(2)}` : `$${stock.price.toFixed(2)}`)
                                                        : stock.price}
                                                </div>
                                                {stock.change !== undefined && (
                                                    <div
                                                        className={cn(
                                                            'text-[10px] font-semibold flex items-center justify-end gap-0.5',
                                                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                                                        )}
                                                    >
                                                        {isPositive ? (
                                                            <TrendingUp className="w-2.5 h-2.5" />
                                                        ) : (
                                                            <TrendingDown className="w-2.5 h-2.5" />
                                                        )}
                                                        {isPositive ? `+${stock.change}%` : `${stock.change}%`}
                                                    </div>
                                                )}
                                            </div>
                                            <span
                                                className={cn(
                                                    'text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase',
                                                    stock.type === 'BUY'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : stock.type === 'SELL'
                                                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                                )}
                                            >
                                                {stock.type}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
