# STOXR — Autonomous Real-Time Financial Intelligence

STOXR is an autonomous real-time stock analysis and market intelligence dashboard covering Indian Equities (NSE/BSE) and US Equities (NASDAQ/NYSE).

---

## Features
- **Real-Time Market Tracking**: Live price feeds, candlestick charts (1D, 1W, 1M, 1Y, ALL), day range, and trading volumes directly from exchange data.
- **AI Signal Engine**: Tri-factor synthesis combining live price momentum, financial news sentiment, and quantitative technical indicators (RSI, MACD, 200 SMA).
- **Indian & US Equities**: Seamless coverage of NIFTY 50 benchmarks (Reliance, TCS, ICICI Bank, HDFC Bank, etc.) alongside US equities (NVIDIA, Apple, Microsoft, etc.).
- **Luxury Monochrome UI**: High-contrast black and white bento dashboard designed for quantitative workflows.
- **Supabase Integration**: Secure authentication and automated keep-alive system.

---

## Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run Supabase keep-alive daemon
bun run keepalive
```
