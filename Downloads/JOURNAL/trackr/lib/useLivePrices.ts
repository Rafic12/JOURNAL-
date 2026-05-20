import { useState, useEffect } from 'react';

// Maps common symbols to Binance symbols if applicable
const BINANCE_MAPPING: Record<string, string> = {
  'BTCUSD': 'BTCUSDT',
  'ETHUSD': 'ETHUSDT',
  'SOLUSD': 'SOLUSDT',
};

function isCrypto(symbol: string): boolean {
  return !!BINANCE_MAPPING[symbol] || symbol.endsWith('USDT');
}

export function mapToYahooSymbol(symbol: string): string {
  const sym = symbol.toUpperCase().trim();
  if (sym === 'EURUSD' || sym === 'EUR/USD') return 'EURUSD=X';
  if (sym === 'GBPUSD' || sym === 'GBP/USD') return 'GBPUSD=X';
  if (sym === 'USDJPY' || sym === 'USD/JPY') return 'USDJPY=X';
  if (sym === 'AUDUSD' || sym === 'AUD/USD') return 'AUDUSD=X';
  if (sym === 'USDCAD' || sym === 'USD/CAD') return 'USDCAD=X';
  if (sym === 'USDCHF' || sym === 'USD/CHF') return 'USDCHF=X';
  if (sym === 'XAUUSD' || sym === 'XAU/USD') return 'GC=F';
  if (sym === 'US30' || sym === 'DJI') return '^DJI';
  if (sym === 'NAS100' || sym === 'IXIC') return '^IXIC';
  if (sym === 'SPX500' || sym === 'SPX') return '^GSPC';
  if (sym === 'BTCUSD' || sym === 'BTCUSDT') return 'BTC-USD';
  if (sym === 'ETHUSD' || sym === 'ETHUSDT') return 'ETH-USD';
  if (sym === 'SOLUSD' || sym === 'SOLUSDT') return 'SOL-USD';
  return sym;
}

export function mapFromYahooSymbol(ySymbol: string): string {
  const sym = ySymbol.toUpperCase().trim();
  if (sym === 'EURUSD=X') return 'EURUSD';
  if (sym === 'GBPUSD=X') return 'GBPUSD';
  if (sym === 'USDJPY=X') return 'USDJPY';
  if (sym === 'AUDUSD=X') return 'AUDUSD';
  if (sym === 'USDCAD=X') return 'USDCAD';
  if (sym === 'USDCHF=X') return 'USDCHF';
  if (sym === 'GC=F') return 'XAUUSD';
  if (sym === '^DJI') return 'US30';
  if (sym === '^IXIC') return 'NAS100';
  if (sym === '^GSPC') return 'SPX500';
  if (sym === 'BTC-USD') return 'BTCUSD';
  if (sym === 'ETH-USD') return 'ETHUSD';
  if (sym === 'SOL-USD') return 'SOLUSD';
  return sym;
}

export function useLivePrices(symbols: string[], apiKeys?: { finnhub?: string }) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    const cryptoSymbols = symbols.filter(isCrypto);
    const fiatSymbols = symbols.filter(s => !isCrypto(s));

    let isActive = true;
    let cryptoWs: WebSocket | null = null;
    let yahooInterval: NodeJS.Timeout | null = null;

    // 1. Setup Binance WebSocket for Crypto
    if (cryptoSymbols.length > 0) {
      const streams = cryptoSymbols.map(s => {
        const binanceSym = BINANCE_MAPPING[s] || s;
        return `${binanceSym.toLowerCase()}@ticker`;
      }).join('/');
      
      cryptoWs = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);
      
      cryptoWs.onmessage = (event) => {
        if (!isActive) return;
        try {
          const data = JSON.parse(event.data);
          const currentPrice = parseFloat(data.c);
          const binanceSym = data.s;
          const originalSym = Object.keys(BINANCE_MAPPING).find(k => BINANCE_MAPPING[k] === binanceSym) || binanceSym;
          setPrices(prev => ({ ...prev, [originalSym]: currentPrice }));
        } catch (e) {}
      };
    }

    // 2. Fetch Forex/Indices from Yahoo Finance API (Polled every 5 seconds)
    if (fiatSymbols.length > 0) {
      const fetchYahooPrices = async () => {
        if (!isActive) return;
        try {
          const mapped = fiatSymbols.map(mapToYahooSymbol);
          const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${mapped.join(',')}`);
          const data = await res.json();
          if (data?.quoteResponse?.result) {
            const updates: Record<string, number> = {};
            data.quoteResponse.result.forEach((quote: any) => {
              const original = mapFromYahooSymbol(quote.symbol);
              if (quote.regularMarketPrice) {
                updates[original] = parseFloat(quote.regularMarketPrice);
              }
            });
            setPrices(prev => ({ ...prev, ...updates }));
          }
        } catch (e) {
          console.error('Yahoo Finance API Error:', e);
        }
      };

      fetchYahooPrices();
      yahooInterval = setInterval(fetchYahooPrices, 5000);
    }

    return () => {
      isActive = false;
      if (cryptoWs) cryptoWs.close();
      if (yahooInterval) clearInterval(yahooInterval);
    };
  }, [symbols.join(',')]);

  return prices;
}
