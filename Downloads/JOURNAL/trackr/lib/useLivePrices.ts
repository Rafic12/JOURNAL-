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

export function useLivePrices(symbols: string[], apiKeys?: { finnhub?: string }) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    const cryptoSymbols = symbols.filter(isCrypto);
    const fiatSymbols = symbols.filter(s => !isCrypto(s));

    let isActive = true;
    let cryptoWs: WebSocket | null = null;
    let finnhubWs: WebSocket | null = null;
    let simInterval: NodeJS.Timeout | null = null;

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

    // 2. Setup Finnhub WebSocket or Simulated Feed for Forex/Indices
    if (fiatSymbols.length > 0) {
      if (apiKeys?.finnhub) {
        // Use real Finnhub websocket
        finnhubWs = new WebSocket(`wss://ws.finnhub.io?token=${apiKeys.finnhub}`);
        finnhubWs.onopen = () => {
          fiatSymbols.forEach(sym => {
            // Finnhub symbols for forex usually look like OANDA:EUR_USD or BINANCE:BTCUSDT
            // We do a simple mapping here for common ones, or fallback to exact string.
            let finnhubSym = sym;
            if (sym === 'EURUSD') finnhubSym = 'OANDA:EUR_USD';
            if (sym === 'GBPUSD') finnhubSym = 'OANDA:GBP_USD';
            if (sym === 'US30') finnhubSym = 'OANDA:US30_USD';
            finnhubWs?.send(JSON.stringify({ 'type': 'subscribe', 'symbol': finnhubSym }));
          });
        };
        finnhubWs.onmessage = (event) => {
          if (!isActive) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'trade' && data.data && data.data.length > 0) {
              const latest = data.data[data.data.length - 1];
              let parsedSym = latest.s;
              if (parsedSym === 'OANDA:EUR_USD') parsedSym = 'EURUSD';
              if (parsedSym === 'OANDA:GBP_USD') parsedSym = 'GBPUSD';
              if (parsedSym === 'OANDA:US30_USD') parsedSym = 'US30';
              setPrices(prev => ({ ...prev, [parsedSym]: latest.p }));
            }
          } catch (e) {}
        };
      } else {
        // Fallback to Simulated Feed
        const basePrices: Record<string, number> = {};
        fiatSymbols.forEach(sym => {
          if (sym === 'EURUSD') basePrices[sym] = 1.0850;
          else if (sym === 'GBPUSD') basePrices[sym] = 1.2650;
          else if (sym === 'XAUUSD') basePrices[sym] = 2020.50;
          else if (sym === 'US30') basePrices[sym] = 38500;
          else if (sym === 'NAS100') basePrices[sym] = 17500;
          else basePrices[sym] = 100;
        });

        setPrices(prev => ({ ...prev, ...basePrices }));

        simInterval = setInterval(() => {
          if (!isActive) return;
          setPrices(prev => {
            const next = { ...prev };
            fiatSymbols.forEach(sym => {
              const current = next[sym] || basePrices[sym];
              const changePct = (Math.random() - 0.5) * 0.0002;
              next[sym] = current * (1 + changePct);
            });
            return next;
          });
        }, 1000);
      }
    }

    return () => {
      isActive = false;
      if (cryptoWs) cryptoWs.close();
      if (finnhubWs) finnhubWs.close();
      if (simInterval) clearInterval(simInterval);
    };
  }, [symbols.join(','), apiKeys?.finnhub]);

  return prices;
}
