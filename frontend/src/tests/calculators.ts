import type { PriceItem, SignalItem, DividendItem } from './types';

// Calculate expected signals for buy_the_dip strategy
export function calculateBuyTheDipSignals(
  prices: PriceItem[],
  threshold: number,
  lookbackPeriod: 'daily' | 'weekly' | 'monthly'
): SignalItem[] {
  const lookbackOffset = getLookbackOffset(lookbackPeriod);
  const signals: SignalItem[] = [];

  for (let i = lookbackOffset; i < prices.length; i++) {
    const currentPrice = prices[i].adjusted_close;
    const lookbackPrice = prices[i - lookbackOffset].adjusted_close;
    const priceChange = (currentPrice - lookbackPrice) / lookbackPrice;

    if (priceChange <= threshold) {
      signals.push({
        date: prices[i].date,
        action: 'BUY',
        price: currentPrice,
        trigger_details: {
          price_change_pct: priceChange,
          lookback_price: lookbackPrice,
          threshold,
        },
      });
    }
  }

  return signals;
}

// Calculate expected signals for buy_and_hold strategy
export function calculateBuyAndHoldSignals(prices: PriceItem[]): SignalItem[] {
  if (prices.length === 0) return [];

  return [{
    date: prices[0].date,
    action: 'BUY',
    price: prices[0].adjusted_close,
    trigger_details: {},
  }];
}

// Get lookback offset in trading days
export function getLookbackOffset(period: 'daily' | 'weekly' | 'monthly'): number {
  switch (period) {
    case 'daily': return 1;
    case 'weekly': return 5;
    case 'monthly': return 21;
    default: return 1;
  }
}

// Calculate expected portfolio value at a given step
export interface PortfolioStep {
  date: string;
  cash: number;
  shares: number;
  holdingsValue: number;
  portfolioValue: number;
}

export function simulatePortfolio(
  initialCapital: number,
  investmentPerTrade: number,
  transactionCostPct: number,
  cashInterestRatePct: number,
  reinvestDividends: boolean,
  signals: SignalItem[],
  prices: PriceItem[],
  dividends: DividendItem[]
): {
  timeSeries: PortfolioStep[];
  totalInvested: number;
  totalTransactionCosts: number;
  totalDividendsReceived: number;
} {
  let cash = initialCapital;
  let shares = 0;
  let totalInvested = 0;
  let totalTransactionCosts = 0;
  let totalDividendsReceived = 0;

  const dailyInterestRate = cashInterestRatePct > 0
    ? Math.pow(1 + cashInterestRatePct / 100, 1 / 252) - 1
    : 0;

  const signalsByDate = new Map<string, SignalItem[]>();
  for (const signal of signals) {
    const existing = signalsByDate.get(signal.date) || [];
    existing.push(signal);
    signalsByDate.set(signal.date, existing);
  }

  const dividendsByDate = new Map<string, DividendItem[]>();
  for (const dividend of dividends) {
    const existing = dividendsByDate.get(dividend.ex_date) || [];
    existing.push(dividend);
    dividendsByDate.set(dividend.ex_date, existing);
  }

  const timeSeries: PortfolioStep[] = [];

  for (const price of prices) {
    const currentPrice = price.adjusted_close;

    // Apply cash interest
    if (dailyInterestRate > 0 && cash > 0) {
      cash *= (1 + dailyInterestRate);
    }

    // Process signals for this date
    const daySignals = signalsByDate.get(price.date) || [];
    for (const signal of daySignals) {
      if (signal.action === 'BUY' && cash >= investmentPerTrade) {
        const txCost = investmentPerTrade * (transactionCostPct / 100);
        const netInvestment = investmentPerTrade - txCost;
        const sharesBought = netInvestment / signal.price;

        cash -= investmentPerTrade;
        shares += sharesBought;
        totalInvested += investmentPerTrade;
        totalTransactionCosts += txCost;
      }
    }

    // Process dividends for this date
    const dayDividends = dividendsByDate.get(price.date) || [];
    for (const dividend of dayDividends) {
      if (shares > 0) {
        const dividendPayment = shares * dividend.amount_per_share;
        totalDividendsReceived += dividendPayment;

        if (reinvestDividends && currentPrice > 0) {
          const newShares = dividendPayment / currentPrice;
          shares += newShares;
        } else {
          cash += dividendPayment;
        }
      }
    }

    const holdingsValue = shares * currentPrice;
    const portfolioValue = cash + holdingsValue;

    timeSeries.push({
      date: price.date,
      cash: round(cash, 2),
      shares: round(shares, 6),
      holdingsValue: round(holdingsValue, 2),
      portfolioValue: round(portfolioValue, 2),
    });
  }

  return {
    timeSeries,
    totalInvested: round(totalInvested, 2),
    totalTransactionCosts: round(totalTransactionCosts, 2),
    totalDividendsReceived: round(totalDividendsReceived, 2),
  };
}

// Calculate expected metrics
export function calculateTotalReturn(initialValue: number, finalValue: number): number {
  if (initialValue === 0) return 0;
  return ((finalValue - initialValue) / initialValue) * 100;
}

export function calculateAnnualizedReturn(
  initialValue: number,
  finalValue: number,
  days: number
): number {
  if (initialValue === 0 || days === 0) return 0;
  return (Math.pow(finalValue / initialValue, 365 / days) - 1) * 100;
}

export function calculateVolatility(portfolioValues: number[]): number {
  if (portfolioValues.length < 2) return 0;

  const dailyReturns: number[] = [];
  for (let i = 1; i < portfolioValues.length; i++) {
    if (portfolioValues[i - 1] > 0) {
      const dailyReturn = (portfolioValues[i] - portfolioValues[i - 1]) / portfolioValues[i - 1];
      dailyReturns.push(dailyReturn);
    }
  }

  if (dailyReturns.length === 0) return 0;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const squaredDiffs = dailyReturns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev * Math.sqrt(252) * 100;
}

export function calculateSharpeRatio(
  annualizedReturn: number,
  volatility: number,
  riskFreeRate: number
): number {
  if (volatility === 0) return 0;
  return (annualizedReturn - riskFreeRate) / volatility;
}

export function calculateMaxDrawdown(portfolioValues: number[]): {
  drawdownPct: number;
  peakIndex: number;
  valleyIndex: number;
} {
  if (portfolioValues.length < 2) {
    return { drawdownPct: 0, peakIndex: 0, valleyIndex: 0 };
  }

  let maxDrawdown = 0;
  let peakIndex = 0;
  let valleyIndex = 0;
  let currentPeak = portfolioValues[0];
  let currentPeakIndex = 0;

  for (let i = 1; i < portfolioValues.length; i++) {
    if (portfolioValues[i] > currentPeak) {
      currentPeak = portfolioValues[i];
      currentPeakIndex = i;
    } else {
      const drawdown = (currentPeak - portfolioValues[i]) / currentPeak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        peakIndex = currentPeakIndex;
        valleyIndex = i;
      }
    }
  }

  return {
    drawdownPct: -maxDrawdown * 100,
    peakIndex,
    valleyIndex,
  };
}

// Utility: round to specified decimal places
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Utility: compare numbers with tolerance
export function approxEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

// Utility: format number for display
export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}
