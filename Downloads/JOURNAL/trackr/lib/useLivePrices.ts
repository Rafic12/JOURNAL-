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

function toTwelveDataSymbol(sym: string): string {
  const s = sym.toUpperCase().replace('/', '');
  if (s === 'US30') return 'DJI';
  if (s === 'NAS100') return 'IXIC';
  if (s === 'SPX500') return 'SPX';
  return s;
}

function fromTwelveDataSymbol(tdSymbol: string): string {
  const s = tdSymbol.toUpperCase().replace('/', '');
  if (s === 'DJI') return 'US30';
  if (s === 'IXIC') return 'NAS100';
  if (s === 'SPX') return 'SPX500';
  return s;
}

export function useLivePrices(symbols: string[], apiKeys?: { finnhub?: string; twelveData?: string }) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    const cryptoSymbols = symbols.filter(isCrypto);
    const fiatSymbols = symbols.filter(s => !isCrypto(s));

    let isActive = true;
    let cryptoWs: WebSocket | null = null;
    let finnhubWs: WebSocket | null = null;
    let twelveDataWs: WebSocket | null = null;
    let simInterval: NodeJS.Timeout | null = null;
    let twelvePollingInterval: NodeJS.Timeout | null = null;

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

    // 2. Setup Forex/Indices (Twelve Data -> Finnhub -> Simulated)
    if (fiatSymbols.length > 0) {
      if (apiKeys?.twelveData) {
        // Twelve Data WebSocket setup
        try {
          twelveDataWs = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKeys.twelveData}`);
          twelveDataWs.onopen = () => {
            const mapped = fiatSymbols.map(toTwelveDataSymbol);
            twelveDataWs?.send(JSON.stringify({
              action: 'subscribe',
              params: { symbols: mapped.join(',') }
            }));
          };
          twelveDataWs.onmessage = (event) => {
            if (!isActive) return;
            try {
              const data = JSON.parse(event.data);
              if (data.event === 'price' && data.price && data.symbol) {
                const original = fromTwelveDataSymbol(data.symbol);
                setPrices(prev => ({ ...prev, [original]: parseFloat(data.price) }));
              }
            } catch (e) {}
          };
        } catch (err) {
          console.error('Twelve Data WebSocket Error:', err);
        }

        // Twelve Data Robust REST Polling Fallback (Every 8 seconds)
        const fetchTwelvePrices = async () => {
          if (!isActive) return;
          try {
            const mappedSymbols = fiatSymbols.map(toTwelveDataSymbol).join(',');
            const res = await fetch(`https://api.twelvedata.com/price?symbol=${mappedSymbols}&apikey=${apiKeys.twelveData}`);
            const data = await res.json();
            if (!data || data.status === 'error') return;

            setPrices(prev => {
              const next = { ...prev };
              fiatSymbols.forEach(sym => {
                const mappedSym = toTwelveDataSymbol(sym);
                const item = data[mappedSym];
                if (item && item.price) {
                  next[sym] = parseFloat(item.price);
                } else if (data.price && fiatSymbols.length === 1) {
                  next[sym] = parseFloat(data.price);
                }
              });
              return next;
            });
          } catch (e) {}
        };

        fetchTwelvePrices();
        twelvePollingInterval = setInterval(fetchTwelvePrices, 8000);

      } else if (apiKeys?.finnhub) {
        // Use Finnhub WebSocket
        finnhubWs = new WebSocket(`wss://ws.finnhub.io?token=${apiKeys.finnhub}`);
        finnhubWs.onopen = () => {
          fiatSymbols.forEach(sym => {
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
      if (twelveDataWs) twelveDataWs.close();
      if (simInterval) clearInterval(simInterval);
      if (twelvePollingInterval) clearInterval(twelvePollingInterval);
    };
  }, [symbols.join(','), apiKeys?.finnhub, apiKeys?.twelveData]);

  return prices;
}
