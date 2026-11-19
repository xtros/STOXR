// src/services/liveMarketService.ts

export interface LiveMarketData {
  symbol: string;
  currency: string;
  regularMarketPrice: number;
  previousClose: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  regularMarketVolume: number;
  chartData: Array<{
    time: string;
    price: number;
    volume: number;
  }>;
}

const INDIAN_SYMBOLS = new Set([
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'TATAMOTORS', 'BHARTIARTL', 'SBIN', 'ITC', 'BAJFINANCE',
  'LT', 'WIPRO', 'MARUTI', 'TITAN', 'ZOMATO', 'NIFTY 50', 'SENSEX'
]);

export function getExchangeTicker(asset: string): string {
  const clean = asset.trim().toUpperCase();
  if (clean === 'NIFTY 50') return '^NSEI';
  if (clean === 'SENSEX') return '^BSESN';
  if (clean === 'ZOMATO') return 'ETERNAL.NS';
  if (clean === 'TATAMOTORS') return 'TMPV.NS';
  if (clean === 'SQ') return 'BLOCK';
  if (INDIAN_SYMBOLS.has(clean)) {
    return `${clean}.NS`;
  }
  return clean;
}

export async function fetchLiveChartData(
  asset: string,
  timeframe: '1D' | '1W' | '1M' | '1Y' | 'ALL'
): Promise<LiveMarketData | null> {
  const ticker = getExchangeTicker(asset);

  let range = '1d';
  let interval = '15m';

  switch (timeframe) {
    case '1D':
      range = '1d';
      interval = '15m';
      break;
    case '1W':
      range = '5d';
      interval = '30m';
      break;
    case '1M':
      range = '1mo';
      interval = '1d';
      break;
    case '1Y':
      range = '1y';
      interval = '1wk';
      break;
    case 'ALL':
      range = '5y';
      interval = '1mo';
      break;
  }

  try {
    const url = `/api/finance/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[LiveMarketService] HTTP ${response.status} fetching ${ticker}`);
      return null;
    }

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes: number[] = quotes.close || [];
    const volumes: number[] = quotes.volume || [];

    const chartData: Array<{ time: string; price: number; volume: number }> = [];

    for (let i = 0; i < timestamps.length; i++) {
      const price = closes[i];
      if (price !== null && price !== undefined && !isNaN(price)) {
        const date = new Date(timestamps[i] * 1000);
        let timeLabel = '';

        if (timeframe === '1D') {
          timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } else if (timeframe === '1W') {
          timeLabel = date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
        } else if (timeframe === '1M' || timeframe === '1Y') {
          timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } else {
          timeLabel = date.toLocaleDateString([], { year: '2-digit', month: 'short' });
        }

        chartData.push({
          time: timeLabel,
          price: Number(price.toFixed(2)),
          volume: volumes[i] || 0,
        });
      }
    }

    const isIndian = INDIAN_SYMBOLS.has(asset.toUpperCase()) || ticker.endsWith('.NS') || ticker.endsWith('.BO');

    return {
      symbol: asset,
      currency: isIndian ? '₹' : (meta.currency === 'INR' ? '₹' : '$'),
      regularMarketPrice: meta.regularMarketPrice || (chartData.length ? chartData[chartData.length - 1].price : 0),
      previousClose: meta.previousClose || meta.chartPreviousClose || 0,
      regularMarketDayHigh: meta.regularMarketDayHigh || meta.dayHigh || 0,
      regularMarketDayLow: meta.regularMarketDayLow || meta.dayLow || 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      regularMarketVolume: meta.regularMarketVolume || 0,
      chartData,
    };
  } catch (error) {
    console.error(`[LiveMarketService] Error fetching live data for ${asset}:`, error);
    return null;
  }
}

export async function fetchLiveQuote(asset: string): Promise<{ price: string; change: number } | null> {
  const ticker = getExchangeTicker(asset);
  try {
    const response = await fetch(`/api/finance/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`);
    if (!response.ok) return null;
    const json = await response.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (meta && meta.regularMarketPrice) {
      const isIndian = INDIAN_SYMBOLS.has(asset.toUpperCase()) || meta.currency === 'INR';
      const curr = isIndian ? '₹' : '$';
      const priceFormatted = `${curr}${meta.regularMarketPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const changeVal = meta.regularMarketChangePercent !== undefined ? Number(meta.regularMarketChangePercent.toFixed(2)) : 0;
      return { price: priceFormatted, change: changeVal };
    }
  } catch {
    return null;
  }
  return null;
}

export interface ExchangeMarketStatus {
  isOpen: boolean;
  sessionTitle: string;
  badgeText: string;
  timeContext: string;
}

export function getExchangeStatus(): {
  indian: ExchangeMarketStatus;
  us: ExchangeMarketStatus;
} {
  const now = new Date();

  // IST calculation (UTC + 5.5 hours)
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utcMs + 5.5 * 3600000);
  const istDay = istTime.getDay(); // 0 is Sun, 6 is Sat
  const istTotalMins = istTime.getHours() * 60 + istTime.getMinutes();

  // NSE / BSE regular market hours: 9:15 AM to 3:30 PM IST (Mon-Fri)
  const isIndianWeekday = istDay >= 1 && istDay <= 5;
  const isIndianOpen = isIndianWeekday && istTotalMins >= 555 && istTotalMins < 930;

  // US market (NYSE / NASDAQ) hours: 9:30 AM to 4:00 PM EST (Mon-Fri)
  const usTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const usDay = usTime.getDay();
  const usTotalMins = usTime.getHours() * 60 + usTime.getMinutes();
  const isUsOpen = (usDay >= 1 && usDay <= 5) && usTotalMins >= 570 && usTotalMins < 960;

  return {
    indian: {
      isOpen: isIndianOpen,
      sessionTitle: isIndianOpen ? 'NSE / BSE Trading Session Active' : 'NSE / BSE Market Closed',
      badgeText: isIndianOpen ? 'NSE: LIVE' : 'NSE: CLOSED',
      timeContext: isIndianOpen ? 'Regular Hours (09:15 - 15:30 IST)' : 'Closed at 3:30 PM IST • Showing Last Close'
    },
    us: {
      isOpen: isUsOpen,
      sessionTitle: isUsOpen ? 'NYSE / NASDAQ Trading Session Active' : 'US Markets Closed',
      badgeText: isUsOpen ? 'US: LIVE' : 'US: CLOSED',
      timeContext: isUsOpen ? 'Regular Hours (09:30 - 16:00 EST)' : 'Reopens 09:30 AM EST'
    }
  };
}
