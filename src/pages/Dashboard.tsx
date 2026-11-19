import React, { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StockSearch } from "@/components/StockSearch";
import { SignalCard } from "@/components/SignalCard";
import { StockDetailModal } from "@/components/StockDetailModal";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Flame,
  Star,
  Activity,
  Layers,
  BarChart3,
  Search,
  Bell,
  Shuffle,
  Calendar,
  Shield,
  Zap,
  Globe,
  Radio,
  CheckCircle2,
  DollarSign,
  Maximize2
} from "lucide-react";
import sampleData from "@/data/sampleData.json";
import { useNewsData } from "@/hooks/useNewsData";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { fetchLiveQuote, fetchLiveChartData, getExchangeStatus, type LiveMarketData } from "@/services/liveMarketService";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Signal = {
  id: string;
  asset: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timestamp: string;
  description: string;
  sources: Array<'news' | 'social' | 'technical'>;
  price: string | number;
  change: number;
  redditMentions?: number;
  newsArticles?: number;
  socialSentiment?: string;
  indicator?: string;
  value?: number;
};

const INDIAN_TICKERS = new Set([
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'TATAMOTORS', 'BHARTIARTL', 'SBIN', 'ITC', 'BAJFINANCE',
  'LT', 'WIPRO', 'MARUTI', 'TITAN', 'ZOMATO', 'NIFTY 50', 'SENSEX'
]);

const STOCK_SECTOR_MAP: Record<string, string> = {
  RELIANCE: 'Energy & Conglomerate',
  TCS: 'IT Services & Software',
  HDFCBANK: 'Banking & Financials',
  INFY: 'IT Services & Software',
  ICICIBANK: 'Banking & Financials',
  TATAMOTORS: 'Automotive & EV',
  BHARTIARTL: 'Telecommunications',
  SBIN: 'Banking & Financials',
  ITC: 'Consumer Goods & FMCG',
  BAJFINANCE: 'Non-Banking Financials',
  LT: 'Infrastructure & Engineering',
  WIPRO: 'IT Services & Software',
  MARUTI: 'Automobile Manufacturing',
  TITAN: 'Consumer & Retail',
  ZOMATO: 'Consumer Tech & Food Delivery',
  AAPL: 'Consumer Technology',
  ADBE: 'Enterprise Software',
  AMD: 'Semiconductors & Chips',
  AMZN: 'E-Commerce & Cloud',
  BABA: 'E-Commerce & Internet',
  CRM: 'Enterprise Cloud & SaaS',
  CSCO: 'Networking & Telecommunications',
  DIS: 'Entertainment & Media',
  DOCU: 'Cloud Software',
  GOOGL: 'Internet Services & AI',
  INTC: 'Semiconductor Manufacturing',
  JPM: 'Investment & Banking',
  META: 'Social Platforms & AI',
  MSFT: 'Enterprise Software & Cloud',
  NFLX: 'Streaming & Media',
  NVDA: 'AI Semiconductors & GPU',
  ORCL: 'Enterprise Software & Cloud',
  PINS: 'Social Media & Advertising',
  PYPL: 'Fintech & Digital Payments',
  ROKU: 'Streaming & Hardware',
  SHOP: 'E-Commerce Platforms',
  SNAP: 'Digital Media & Camera',
  SQ: 'Fintech & Digital Payments',
  TWTR: 'Social Media',
  UBER: 'Ride-Hailing & Mobility',
  V: 'Payment Networks & Financials',
  ZM: 'Cloud Communications',
};

export function getStockCategory(symbolA?: string, symbolB?: string): string {
  if (!symbolA) return 'Equities Market';
  const catA = STOCK_SECTOR_MAP[symbolA.toUpperCase()] || 'Equities';
  if (!symbolB) return catA;
  const catB = STOCK_SECTOR_MAP[symbolB.toUpperCase()] || 'Equities';
  if (catA === catB) return catA;
  return `${catA}  •  ${catB}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [filterType, setFilterType] = useState('all');
  const [marketFilter, setMarketFilter] = useState<'all' | 'indian' | 'us'>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [stockSearchResults, setStockSearchResults] = useState<any[]>([]);
  const [selectedStockForModal, setSelectedStockForModal] = useState<Signal | null>(null);
  const [showAllSignalsGrid, setShowAllSignalsGrid] = useState(false);

  // Live signals from scheduler/hook
  const { articles, signals: liveSignals, marketData } = useNewsData();
  const { dashboardMetrics, signals: initialSignals, marketNews } = sampleData;

  // Base signal list
  const [signalsList, setSignalsList] = useState<Signal[]>(initialSignals as Signal[]);

  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const marketStatus = useMemo(() => getExchangeStatus(), [refreshKey, lastSyncTime]);

  // Periodically fetch live real-time prices for all tracked stocks (Auto-polling every 15s)
  useEffect(() => {
    let isMounted = true;
    const allTrackedTickers = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
      'TATAMOTORS', 'BHARTIARTL', 'SBIN', 'ITC', 'BAJFINANCE',
      'LT', 'WIPRO', 'MARUTI', 'TITAN', 'ZOMATO',
      'NVDA', 'AAPL', 'MSFT', 'TSLA', 'GOOGL', 'META', 'AMZN'
    ];
    
    const fetchAllPrices = () => {
      allTrackedTickers.forEach((sym) => {
        fetchLiveQuote(sym).then((res) => {
          if (!isMounted || !res) return;
          setSignalsList((prev) =>
            prev.map((s) =>
              s.asset.toUpperCase() === sym
                ? { ...s, price: res.price, change: res.change }
                : s
            )
          );
        });
      });
      if (isMounted) {
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    };

    // Initial fetch
    fetchAllPrices();

    // Auto-polling interval every 15 seconds
    const intervalId = setInterval(fetchAllPrices, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshKey]);

  // Is Indian check
  const isIndian = (s: Signal) =>
    INDIAN_TICKERS.has(s.asset.toUpperCase()) ||
    String(s.price).includes('₹') ||
    s.description.includes('₹') ||
    s.description.includes('NSE');

  // Filtered signals for standings table and grid
  const filteredSignals = useMemo(() => {
    return signalsList.filter((s) => {
      const matchMarket =
        marketFilter === 'all' ||
        (marketFilter === 'indian' && isIndian(s)) ||
        (marketFilter === 'us' && !isIndian(s));
      const matchType =
        filterType === 'all' || s.type.toLowerCase() === filterType.toLowerCase();
      return matchMarket && matchType;
    });
  }, [signalsList, marketFilter, filterType]);

  // Summary statistics for "Market Statistics" card
  const stats = useMemo(() => {
    const total = filteredSignals.length || 1;
    const buyCount = filteredSignals.filter((s) => s.type === 'BUY').length;
    const holdCount = filteredSignals.filter((s) => s.type === 'HOLD').length;
    const sellCount = filteredSignals.filter((s) => s.type === 'SELL').length;

    const buyPct = Math.round((buyCount / total) * 100);
    const holdPct = Math.round((holdCount / total) * 100);
    const sellPct = Math.max(0, 100 - buyPct - holdPct);

    return { total, buyCount, holdCount, sellCount, buyPct, holdPct, sellPct };
  }, [filteredSignals]);

  // Standings sorting state (defaults to AI Score descending)
  const [standingsSortBy, setStandingsSortBy] = useState<'score' | 'change' | 'price' | 'asset'>('score');
  const [standingsSortOrder, setStandingsSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSortToggle = (column: 'score' | 'change' | 'price' | 'asset') => {
    if (standingsSortBy === column) {
      setStandingsSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setStandingsSortBy(column);
      setStandingsSortOrder('desc');
    }
  };

  const sortedSignals = useMemo(() => {
    return [...filteredSignals].sort((a, b) => {
      let valA: any = a.confidence || 0;
      let valB: any = b.confidence || 0;

      if (standingsSortBy === 'score') {
        valA = a.confidence || 0;
        valB = b.confidence || 0;
      } else if (standingsSortBy === 'change') {
        valA = a.change || 0;
        valB = b.change || 0;
      } else if (standingsSortBy === 'price') {
        valA = parseFloat(String(a.price).replace(/[^0-9.-]/g, '')) || 0;
        valB = parseFloat(String(b.price).replace(/[^0-9.-]/g, '')) || 0;
      } else if (standingsSortBy === 'asset') {
        return standingsSortOrder === 'asc'
          ? a.asset.localeCompare(b.asset)
          : b.asset.localeCompare(a.asset);
      }

      return standingsSortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredSignals, standingsSortBy, standingsSortOrder]);

  // Standings list (top 7 ranking stocks based on selected sort)
  const standings = sortedSignals.slice(0, 7);

  // Dynamic Catalyst Matchup Pairs
  const catalystMatchups = useMemo(() => {
    if (!signalsList || signalsList.length < 2) return [];

    // Pair 1: Top AI Score Leaders (Highest confidence)
    const sortedByConfidence = [...signalsList].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const pair1A = sortedByConfidence[0] || signalsList[0];
    const pair1B = sortedByConfidence[1] || signalsList[1];

    // Pair 2: Top Volatility & Momentum Extremes (Highest absolute % change)
    const sortedByVolatility = [...signalsList].sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0));
    const pair2A = sortedByVolatility[0] || signalsList[2] || signalsList[0];
    const pair2B = sortedByVolatility.find(s => s.asset !== pair2A.asset) || signalsList[3] || signalsList[1];

    // Pair 3: Benchmark Pillar Duel (Banking Titan vs Conglomerate Titan)
    const banking = signalsList.find(s => ['ICICIBANK', 'HDFCBANK', 'SBIN'].includes(s.asset)) || signalsList[0];
    const conglomerate = signalsList.find(s => ['RELIANCE', 'TCS', 'TATAMOTORS'].includes(s.asset) && s.asset !== banking.asset) || signalsList[1];

    // Pair 4: Tech & Growth Titans (TCS vs INFY or NVDA)
    const techLeader = signalsList.find(s => ['TCS', 'INFY', 'WIPRO', 'NVDA'].includes(s.asset)) || signalsList[2];
    const techRival = signalsList.find(s => ['INFY', 'NVDA', 'AAPL'].includes(s.asset) && s.asset !== techLeader.asset) || signalsList[3];

    return [
      {
        id: 'ai-confidence',
        category: 'AI Alpha Leaders',
        badge: 'Top Confidence',
        subtext: 'Algorithmic conviction & multi-factor technical confluence',
        stockA: pair1A,
        stockB: pair1B,
      },
      {
        id: 'volatility-extremes',
        category: 'Momentum Extremes',
        badge: 'High Volatility',
        subtext: 'Top intraday movers with highest directional trading velocity',
        stockA: pair2A,
        stockB: pair2B,
      },
      {
        id: 'benchmark-duel',
        category: 'NSE Benchmark Duel',
        badge: 'Market Heavyweights',
        subtext: 'Banking pillar vs Infrastructure powerhouse comparison',
        stockA: banking,
        stockB: conglomerate,
      },
      {
        id: 'tech-growth',
        category: 'Tech Growth Arbitrage',
        badge: 'Tech Sector',
        subtext: 'Enterprise software & digital transformation momentum',
        stockA: techLeader,
        stockB: techRival,
      },
    ];
  }, [signalsList]);

  const [activeCatalystIndex, setActiveCatalystIndex] = useState(0);
  const [isCatalystPaused, setIsCatalystPaused] = useState(false);

  // Auto-rotate dynamic catalyst matchup every 8 seconds
  useEffect(() => {
    if (catalystMatchups.length <= 1 || isCatalystPaused) return;

    const timer = setInterval(() => {
      setActiveCatalystIndex((prev) => (prev + 1) % catalystMatchups.length);
    }, 8000);

    return () => clearInterval(timer);
  }, [catalystMatchups.length, isCatalystPaused]);

  const currentCatalyst = catalystMatchups[activeCatalystIndex] || catalystMatchups[0];
  const spotlightA = currentCatalyst?.stockA || signalsList[0];
  const spotlightB = currentCatalyst?.stockB || signalsList[1];

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Andrea';

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] p-4 md:p-8 space-y-6 font-sans selection:bg-white selection:text-black">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            Welcome back, <span className="text-zinc-200 font-semibold capitalize">{userName}</span>
            <span className="inline-block animate-wave">👋</span>
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-1">
            Dashboard
          </h1>
        </div>

        {/* Right action bar: Search, Notifications, Avatar */}
        <div className="flex items-center gap-3">
          <StockSearch
            onStockFound={(stockCode, stockData) => {
              if (stockData) {
                setSelectedStockForModal(stockData);
              }
            }}
            className="w-full sm:w-auto"
          />

          <button
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Refresh live feeds"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            className="relative p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white animate-pulse" />
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white uppercase tracking-wider">
              {userName.slice(0, 2)}
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold text-zinc-300 capitalize">
              {userName}
            </span>
          </div>
        </div>
      </div>

      {/* Exchange Session Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0d0d10] border border-zinc-800/80 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          {/* Indian Markets Status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px]",
            marketStatus.indian.isOpen 
              ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
              : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              marketStatus.indian.isOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
            )} />
            <span className="font-bold text-white">🇮🇳 NSE / BSE:</span>
            <span>{marketStatus.indian.isOpen ? "LIVE TRADING (Closes 3:30 PM IST)" : "CLOSED (Session: 9:15 AM – 3:30 PM IST • Showing Official Closing Price)"}</span>
          </div>

          {/* US Markets Status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px]",
            marketStatus.us.isOpen 
              ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
              : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              marketStatus.us.isOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
            )} />
            <span className="font-bold text-white">🇺🇸 US Equities:</span>
            <span>{marketStatus.us.isOpen ? "LIVE TRADING (Closes 4:00 PM EST)" : "CLOSED (Reopens 9:30 AM EST)"}</span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-zinc-400" />
          <span>Sync: <strong className="text-zinc-300">{lastSyncTime}</strong></span>
        </div>
      </div>

      {/* Main Bento Grid Layout (Matching User's Reference Screenshot) */}
      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-12 transition-all duration-300",
        settings.displayDensity === 'compact' ? 'gap-3.5' : settings.displayDensity === 'spacious' ? 'gap-7' : 'gap-5'
      )}>
        
        {/* ROW 1 - LEFT: Dynamic Featured Catalyst / Breakout Card (5 cols) */}
        <div
          onMouseEnter={() => setIsCatalystPaused(true)}
          onMouseLeave={() => setIsCatalystPaused(false)}
          className="lg:col-span-5 bg-[#121215] border border-zinc-800/90 rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all"
        >
          {/* Header */}
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-white" /> Featured Catalyst
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/20">
                {currentCatalyst?.badge || 'Live Dynamic'}
              </span>
            </div>

            {/* Matchup Navigation Controls */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-500 mr-1">
                {activeCatalystIndex + 1}/{catalystMatchups.length}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCatalystIndex((prev) => (prev - 1 + catalystMatchups.length) % catalystMatchups.length);
                }}
                className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Previous catalyst"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCatalystIndex((prev) => (prev + 1) % catalystMatchups.length);
                }}
                className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Next catalyst"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Animated Body */}
          <div className="my-4">
            <div className="text-[11px] text-zinc-400 font-mono mb-2">
              <span className="font-semibold text-zinc-300">
                {getStockCategory(spotlightA?.asset, spotlightB?.asset)}
              </span>
            </div>

            {/* Spotlight Matchup / Versus Header with Framer Motion */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCatalyst?.id || activeCatalystIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center justify-between pt-2"
              >
                {/* Asset 1 */}
                <div
                  onClick={() => setSelectedStockForModal(spotlightA)}
                  className="flex items-center gap-2.5 cursor-pointer p-2 rounded-2xl hover:bg-white/5 transition-all flex-1 min-w-0"
                  title={`View ${spotlightA?.asset} detailed charts & AI signal`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center font-black text-xs text-white shadow-inner flex-shrink-0">
                    {spotlightA?.asset.slice(0, 4)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white whitespace-nowrap">{spotlightA?.asset}</span>
                      {settings.showConfidenceScores && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          spotlightA?.type === 'BUY' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {spotlightA?.confidence || 80}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-white font-mono font-bold">
                        {spotlightA?.price}
                      </span>
                      <span className={`text-[10px] font-mono font-semibold ${
                        (spotlightA?.change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {(spotlightA?.change || 0) >= 0 ? '+' : ''}{spotlightA?.change}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* VS Badge */}
                <div className="w-7 h-7 mx-1 rounded-full bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-[9px] font-black text-zinc-400 uppercase tracking-widest shadow-lg flex-shrink-0">
                  VS
                </div>

                {/* Asset 2 */}
                <div
                  onClick={() => setSelectedStockForModal(spotlightB)}
                  className="flex items-center gap-2.5 cursor-pointer p-2 rounded-2xl hover:bg-white/5 transition-all flex-1 min-w-0 justify-end text-right"
                  title={`View ${spotlightB?.asset} detailed charts & AI signal`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-end gap-1.5">
                      {settings.showConfidenceScores && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          spotlightB?.type === 'BUY' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {spotlightB?.confidence || 80}%
                        </span>
                      )}
                      <span className="font-bold text-sm text-white whitespace-nowrap">{spotlightB?.asset}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-mono font-semibold ${
                        (spotlightB?.change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {(spotlightB?.change || 0) >= 0 ? '+' : ''}{spotlightB?.change}%
                      </span>
                      <span className="text-xs text-white font-mono font-bold">
                        {spotlightB?.price}
                      </span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center font-black text-xs text-white shadow-inner flex-shrink-0">
                    {spotlightB?.asset.slice(0, 4)}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ROW 1 - RIGHT: Games Statistic / Market Statistics Card (7 cols) */}
        <div className="lg:col-span-7 bg-[#121215] border border-zinc-800/90 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-white" /> Market Statistics
            </span>
            <button
              onClick={() => setShowAllSignalsGrid((prev) => !prev)}
              className="hover:text-white transition-colors flex items-center gap-1 font-medium"
            >
              {showAllSignalsGrid ? "Hide all cards" : "View all statistics"} <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Segmented Horizontal Progress Bar */}
          <div className="my-6 space-y-2">
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex p-0.5 border border-zinc-800">
              <div
                style={{ width: `${stats.buyPct}%` }}
                className="bg-white h-full rounded-l-full transition-all duration-500 shadow-sm"
                title={`Buy: ${stats.buyPct}%`}
              />
              <div
                style={{ width: `${stats.holdPct}%` }}
                className="bg-zinc-500 h-full transition-all duration-500"
                title={`Hold: ${stats.holdPct}%`}
              />
              <div
                style={{ width: `${stats.sellPct}%` }}
                className="bg-zinc-800 h-full rounded-r-full transition-all duration-500"
                title={`Sell: ${stats.sellPct}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono px-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white" /> Buy ({stats.buyPct}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-zinc-500" /> Hold ({stats.holdPct}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-zinc-800" /> Sell ({stats.sellPct}%)
              </span>
            </div>
          </div>

          {/* 4 Stat Metric Row */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-800/80 text-center">
            <div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Tracked</div>
              <div className="text-xl font-black text-white mt-0.5">{stats.total}</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Buy</div>
              <div className="text-xl font-black text-white mt-0.5">{stats.buyCount}</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Hold</div>
              <div className="text-xl font-black text-zinc-300 mt-0.5">{stats.holdCount}</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Sell</div>
              <div className="text-xl font-black text-zinc-400 mt-0.5">{stats.sellCount}</div>
            </div>
          </div>
        </div>

        {/* ROW 2 - LEFT: Standings Table (5 cols) */}
        <div className="lg:col-span-5 bg-[#121215] border border-zinc-800/90 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-white" /> Market Standings
              </span>

              {/* Market filter tabs */}
              <div className="flex items-center bg-zinc-900/80 p-0.5 rounded-full border border-zinc-800 text-[11px]">
                <button
                  onClick={() => setMarketFilter('all')}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full transition-all font-medium",
                    marketFilter === 'all' ? "bg-white text-black font-bold shadow" : "text-zinc-400 hover:text-white"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setMarketFilter('indian')}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full transition-all font-medium",
                    marketFilter === 'indian' ? "bg-white text-black font-bold shadow" : "text-zinc-400 hover:text-white"
                  )}
                >
                  🇮🇳 NSE
                </button>
                <button
                  onClick={() => setMarketFilter('us')}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full transition-all font-medium",
                    marketFilter === 'us' ? "bg-white text-black font-bold shadow" : "text-zinc-400 hover:text-white"
                  )}
                >
                  🇺🇸 US
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800/80 pb-2 font-mono text-[11px] select-none">
                    <th className="py-2 pl-2 w-8">#</th>
                    <th
                      onClick={() => handleSortToggle('asset')}
                      className="py-2 cursor-pointer hover:text-white transition-colors"
                      title="Sort by Asset Name"
                    >
                      <span className="inline-flex items-center gap-1">
                        ASSET
                        {standingsSortBy === 'asset' && (
                          <span className="text-[10px] text-white font-bold">{standingsSortOrder === 'desc' ? '↓' : '↑'}</span>
                        )}
                      </span>
                    </th>
                    <th
                      onClick={() => handleSortToggle('price')}
                      className="py-2 text-right cursor-pointer hover:text-white transition-colors"
                      title="Sort by Price"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        PRICE
                        {standingsSortBy === 'price' && (
                          <span className="text-[10px] text-white font-bold">{standingsSortOrder === 'desc' ? '↓' : '↑'}</span>
                        )}
                      </span>
                    </th>
                    <th
                      onClick={() => handleSortToggle('change')}
                      className="py-2 text-right cursor-pointer hover:text-white transition-colors"
                      title="Sort by 24h Change"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        24H
                        {standingsSortBy === 'change' && (
                          <span className="text-[10px] text-white font-bold">{standingsSortOrder === 'desc' ? '↓' : '↑'}</span>
                        )}
                      </span>
                    </th>
                    {settings.showConfidenceScores && (
                      <th
                        onClick={() => handleSortToggle('score')}
                        className="py-2 text-right pr-2 cursor-pointer hover:text-white transition-colors"
                        title="Sort by AI Score"
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          SCORE
                          {standingsSortBy === 'score' && (
                            <span className="text-[10px] text-white font-bold">{standingsSortOrder === 'desc' ? '↓' : '↑'}</span>
                          )}
                        </span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {standings.map((stock, idx) => {
                    const isPositive = (stock.change || 0) >= 0;
                    const rowPad = settings.displayDensity === 'compact' ? 'py-1.5' : settings.displayDensity === 'spacious' ? 'py-4.5' : 'py-3';
                    return (
                      <tr
                        key={stock.id || stock.asset}
                        onClick={() => setSelectedStockForModal(stock)}
                        className="group hover:bg-white/[0.04] cursor-pointer transition-colors"
                      >
                        <td className={cn(rowPad, "pl-2 text-zinc-500 font-mono text-[11px]")}>{idx + 1}</td>
                        <td className={cn(rowPad, "font-semibold text-white flex items-center gap-2")}>
                          <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                            {stock.asset.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-100 group-hover:text-white transition-colors">
                              {stock.asset}
                            </div>
                          </div>
                        </td>
                        <td className={cn(rowPad, "text-right font-mono font-medium text-zinc-200")}>
                          {stock.price}
                        </td>
                        <td className={cn(rowPad, "text-right font-mono text-xs font-semibold", isPositive ? "text-emerald-400" : "text-rose-400")}>
                          {isPositive ? `+${stock.change}%` : `${stock.change}%`}
                        </td>
                        {settings.showConfidenceScores && (
                          <td className={cn(rowPad, "text-right pr-2")}>
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                              {stock.confidence}%
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span className="text-zinc-500 text-[11px]">Showing top {standings.length} ranking stocks</span>
            <button
              onClick={() => setShowAllSignalsGrid(true)}
              className="text-white hover:underline text-[11px] font-semibold flex items-center gap-1"
            >
              View all 42 stocks <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ROW 2 - RIGHT: 4 Bento Cards + Promotional Banner (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          {/* 4 Bento Metric Cards (2x2 grid) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Metric 1 */}
            <div className="bg-[#121215] border border-zinc-800/90 rounded-3xl p-5 shadow-xl flex items-center justify-between hover:border-zinc-700 transition-all">
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  Avg AI Confidence
                </span>
                <div className="text-2xl font-black text-white mt-1">
                  78.5%
                </div>
                <span className="text-[11px] text-zinc-400 mt-0.5 block">High Quality Score</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-[#121215] border border-zinc-800/90 rounded-3xl p-5 shadow-xl flex items-center justify-between hover:border-zinc-700 transition-all">
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  Overall Valuation
                </span>
                <div className="text-2xl font-black text-white mt-1">
                  ₹210.4T
                </div>
                <span className="text-[11px] text-zinc-400 mt-0.5 block">$690.2M US Equities</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-[#121215] border border-zinc-800/90 rounded-3xl p-5 shadow-xl flex items-center justify-between hover:border-zinc-700 transition-all">
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  24h Market Volume
                </span>
                <div className="text-2xl font-black text-white mt-1">
                  ₹45.8K Cr
                </div>
                <span className="text-[11px] text-zinc-400 mt-0.5 block">$240.6M Combined</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-[#121215] border border-zinc-800/90 rounded-3xl p-5 shadow-xl flex items-center justify-between hover:border-zinc-700 transition-all">
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  AI Accuracy Score
                </span>
                <div className="text-2xl font-black text-white mt-1 flex items-center gap-1">
                  8.9 <span className="text-xs text-zinc-500 font-normal">/ 10</span>
                </div>
                <span className="text-[11px] text-zinc-400 mt-0.5 block">Verified Historical</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <Star className="w-5 h-5 fill-white" />
              </div>
            </div>
          </div>

          {/* Bottom Wide Banner (matching the blue-green training banner in the reference image) */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-[#18181b] border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group">
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">
                AI MARKET INTELLIGENCE
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Real-Time Autonomous Signal Scanning
              </h3>
              <p className="text-xs text-zinc-400 max-w-md">
                Algorithmic sentiment analysis + quantitative momentum indicators live on NSE and NASDAQ.
              </p>
            </div>

            <Button
              onClick={() => setShowAllSignalsGrid((prev) => !prev)}
              className="bg-white hover:bg-zinc-200 text-black font-bold px-5 py-2 rounded-2xl text-xs relative z-10 shadow-lg transition-transform hover:scale-105"
            >
              {showAllSignalsGrid ? "Collapse Grid" : "Explore All Signals"} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>

            {/* Subtle background glow */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/[0.05] to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Expandable Full 42-Signals Cards Grid */}
      {showAllSignalsGrid && (
        <div className="space-y-5 pt-4 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                All Active Signals ({filteredSignals.length})
              </h2>
              <p className="text-xs text-zinc-400">
                Click any card to open the live interactive exchange chart.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-zinc-800 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-200"
              >
                <option value="all">All Signals</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
                <option value="hold">Hold</option>
              </select>

              <select
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-zinc-800 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-200"
              >
                <option value="all">All Markets</option>
                <option value="indian">🇮🇳 Indian Stocks (NSE)</option>
                <option value="us">🇺🇸 US Equities</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredSignals.map((signal, idx) => (
              <SignalCard
                key={`${signal.id}-${idx}`}
                signal={signal}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stock Detail Modal (opens when any stock in the standings table or cards is clicked) */}
      <StockDetailModal
        isOpen={!!selectedStockForModal}
        onClose={() => setSelectedStockForModal(null)}
        signal={selectedStockForModal}
      />
    </div>
  );
}
