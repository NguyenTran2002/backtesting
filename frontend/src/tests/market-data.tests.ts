import type { TestCase, PriceItem, DividendItem } from './types';
import { pass, fail } from './types';
import type { ApiResponse } from '../types';

// Market Data Service Tests - /prices endpoint
export const pricesTests: TestCase[] = [
  // FORMAT TESTS (4)
  {
    id: 'md-prices-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('md-prices-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'md-prices-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'md-prices-format-2',
    name: 'Response has prices array',
    category: 'format',
    description: 'Response data should contain a prices array',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: unknown[] }>;
      if (r.data && Array.isArray(r.data.prices)) {
        return pass('md-prices-format-2', 'Response has prices array', 'format');
      }
      return fail(
        'md-prices-format-2',
        'Response has prices array',
        'format',
        'data.prices: Array',
        `data.prices: ${typeof r.data?.prices}`,
        'Response should contain prices array in data'
      );
    },
  },
  {
    id: 'md-prices-format-3',
    name: 'Each price has required fields',
    category: 'format',
    description: 'Each price item should have date, open, high, low, close, adjusted_close, volume',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];
      if (prices.length === 0) {
        return pass('md-prices-format-3', 'Each price has required fields', 'format');
      }

      const requiredFields = ['date', 'open', 'high', 'low', 'close', 'adjusted_close', 'volume'];
      for (const price of prices) {
        for (const field of requiredFields) {
          if (!(field in price)) {
            return fail(
              'md-prices-format-3',
              'Each price has required fields',
              'format',
              `All fields: ${requiredFields.join(', ')}`,
              `Missing field: ${field}`,
              'Each price object must have all required fields'
            );
          }
        }
      }
      return pass('md-prices-format-3', 'Each price has required fields', 'format');
    },
  },
  {
    id: 'md-prices-format-4',
    name: 'Price fields have correct types',
    category: 'format',
    description: 'Numeric fields should be numbers, date should be string',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];
      if (prices.length === 0) {
        return pass('md-prices-format-4', 'Price fields have correct types', 'format');
      }

      const numericFields = ['open', 'high', 'low', 'close', 'adjusted_close', 'volume'];
      for (const price of prices) {
        if (typeof price.date !== 'string') {
          return fail(
            'md-prices-format-4',
            'Price fields have correct types',
            'format',
            'date: string',
            `date: ${typeof price.date}`,
            'Date should be a string'
          );
        }
        for (const field of numericFields) {
          if (typeof price[field as keyof PriceItem] !== 'number') {
            return fail(
              'md-prices-format-4',
              'Price fields have correct types',
              'format',
              `${field}: number`,
              `${field}: ${typeof price[field as keyof PriceItem]}`,
              'Numeric fields should be numbers'
            );
          }
        }
      }
      return pass('md-prices-format-4', 'Price fields have correct types', 'format');
    },
  },

  // CORRECTNESS TESTS (6)
  {
    id: 'md-prices-correct-1',
    name: 'OHLC relationship: low <= close <= high',
    category: 'correctness',
    description: 'Low should be <= close and close should be <= high',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      for (const price of prices) {
        if (price.low > price.close || price.close > price.high) {
          return fail(
            'md-prices-correct-1',
            'OHLC relationship: low <= close <= high',
            'correctness',
            `low <= close <= high`,
            `low=${price.low}, close=${price.close}, high=${price.high}`,
            `Invalid OHLC on ${price.date}`
          );
        }
      }
      return pass('md-prices-correct-1', 'OHLC relationship: low <= close <= high', 'correctness');
    },
  },
  {
    id: 'md-prices-correct-2',
    name: 'OHLC relationship: low <= open <= high',
    category: 'correctness',
    description: 'Low should be <= open and open should be <= high',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      for (const price of prices) {
        if (price.low > price.open || price.open > price.high) {
          return fail(
            'md-prices-correct-2',
            'OHLC relationship: low <= open <= high',
            'correctness',
            `low <= open <= high`,
            `low=${price.low}, open=${price.open}, high=${price.high}`,
            `Invalid OHLC on ${price.date}`
          );
        }
      }
      return pass('md-prices-correct-2', 'OHLC relationship: low <= open <= high', 'correctness');
    },
  },
  {
    id: 'md-prices-correct-3',
    name: 'Prices in chronological order',
    category: 'correctness',
    description: 'Prices should be ordered by date ascending',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      for (let i = 1; i < prices.length; i++) {
        if (prices[i].date < prices[i - 1].date) {
          return fail(
            'md-prices-correct-3',
            'Prices in chronological order',
            'correctness',
            'Dates in ascending order',
            `${prices[i - 1].date} > ${prices[i].date}`,
            'Prices should be sorted by date ascending'
          );
        }
      }
      return pass('md-prices-correct-3', 'Prices in chronological order', 'correctness');
    },
  },
  {
    id: 'md-prices-correct-4',
    name: 'Volume is non-negative',
    category: 'correctness',
    description: 'Volume should be >= 0 for all prices',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      for (const price of prices) {
        if (price.volume < 0) {
          return fail(
            'md-prices-correct-4',
            'Volume is non-negative',
            'correctness',
            'volume >= 0',
            `volume = ${price.volume}`,
            `Negative volume on ${price.date}`
          );
        }
      }
      return pass('md-prices-correct-4', 'Volume is non-negative', 'correctness');
    },
  },
  {
    id: 'md-prices-correct-5',
    name: 'All prices are positive',
    category: 'correctness',
    description: 'Open, high, low, close, adjusted_close should all be > 0',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      for (const price of prices) {
        const priceFields = [price.open, price.high, price.low, price.close, price.adjusted_close];
        if (priceFields.some(p => p <= 0)) {
          return fail(
            'md-prices-correct-5',
            'All prices are positive',
            'correctness',
            'All price values > 0',
            `Found non-positive price on ${price.date}`,
            'Stock prices should always be positive'
          );
        }
      }
      return pass('md-prices-correct-5', 'All prices are positive', 'correctness');
    },
  },
  {
    id: 'md-prices-correct-6',
    name: 'Adjusted close accounts for splits',
    category: 'correctness',
    description: 'Adjusted close should be <= close (for stock splits) or equal',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      // This is a soft check - adjusted_close can be higher in some cases (reverse splits)
      // but typically should be <= close
      let violations = 0;
      for (const price of prices) {
        if (price.adjusted_close > price.close * 1.01) { // Allow 1% tolerance
          violations++;
        }
      }

      if (violations > prices.length * 0.1) { // More than 10% violations is suspicious
        return fail(
          'md-prices-correct-6',
          'Adjusted close accounts for splits',
          'correctness',
          'adjusted_close <= close (typically)',
          `${violations} violations out of ${prices.length}`,
          'Adjusted close is usually <= close due to stock splits'
        );
      }
      return pass('md-prices-correct-6', 'Adjusted close accounts for splits', 'correctness');
    },
  },

  // EDGE CASE TESTS (4)
  {
    id: 'md-prices-edge-1',
    name: 'Returns data for valid request',
    category: 'edge-case',
    description: 'Valid ticker and date range should return price data',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      if (r.success && r.data?.prices && r.data.prices.length > 0) {
        return pass('md-prices-edge-1', 'Returns data for valid request', 'edge-case');
      }
      return fail(
        'md-prices-edge-1',
        'Returns data for valid request',
        'edge-case',
        'Non-empty prices array',
        `${r.data?.prices?.length || 0} prices`,
        'Valid request should return price data'
      );
    },
  },
  {
    id: 'md-prices-edge-2',
    name: 'No duplicate dates',
    category: 'edge-case',
    description: 'Each date should appear only once',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];
      const dates = prices.map(p => p.date);
      const uniqueDates = new Set(dates);

      if (dates.length !== uniqueDates.size) {
        return fail(
          'md-prices-edge-2',
          'No duplicate dates',
          'edge-case',
          'All dates unique',
          `${dates.length} dates, ${uniqueDates.size} unique`,
          'Found duplicate dates in response'
        );
      }
      return pass('md-prices-edge-2', 'No duplicate dates', 'edge-case');
    },
  },
  {
    id: 'md-prices-edge-3',
    name: 'Date format is ISO 8601',
    category: 'edge-case',
    description: 'Dates should be in YYYY-MM-DD format',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      for (const price of prices) {
        if (!dateRegex.test(price.date)) {
          return fail(
            'md-prices-edge-3',
            'Date format is ISO 8601',
            'edge-case',
            'YYYY-MM-DD',
            price.date,
            'Date should be in ISO 8601 format'
          );
        }
      }
      return pass('md-prices-edge-3', 'Date format is ISO 8601', 'edge-case');
    },
  },
  {
    id: 'md-prices-edge-4',
    name: 'Handles trading days only',
    category: 'edge-case',
    description: 'Response should not include weekends (soft check)',
    validate: (response) => {
      const r = response as ApiResponse<{ prices: PriceItem[] }>;
      const prices = r.data?.prices || [];

      let weekendCount = 0;
      for (const price of prices) {
        const date = new Date(price.date);
        const day = date.getUTCDay();
        if (day === 0 || day === 6) {
          weekendCount++;
        }
      }

      if (weekendCount > 0) {
        return fail(
          'md-prices-edge-4',
          'Handles trading days only',
          'edge-case',
          '0 weekend dates',
          `${weekendCount} weekend dates found`,
          'Stock markets are closed on weekends'
        );
      }
      return pass('md-prices-edge-4', 'Handles trading days only', 'edge-case');
    },
  },
];

// Market Data Service Tests - /dividends endpoint
export const dividendsTests: TestCase[] = [
  // FORMAT TESTS (3)
  {
    id: 'md-div-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('md-div-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'md-div-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'md-div-format-2',
    name: 'Response has dividends array',
    category: 'format',
    description: 'Response data should contain a dividends array',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: unknown[] }>;
      if (r.data && Array.isArray(r.data.dividends)) {
        return pass('md-div-format-2', 'Response has dividends array', 'format');
      }
      return fail(
        'md-div-format-2',
        'Response has dividends array',
        'format',
        'data.dividends: Array',
        `data.dividends: ${typeof r.data?.dividends}`,
        'Response should contain dividends array in data'
      );
    },
  },
  {
    id: 'md-div-format-3',
    name: 'Each dividend has required fields',
    category: 'format',
    description: 'Each dividend should have ex_date, amount_per_share (payment_date may be null)',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];
      if (dividends.length === 0) {
        return pass('md-div-format-3', 'Each dividend has required fields', 'format');
      }

      // ex_date and amount_per_share are required, payment_date may be null from Yahoo Finance
      const strictlyRequired = ['ex_date', 'amount_per_share'];
      for (const div of dividends) {
        for (const field of strictlyRequired) {
          if (!(field in div) || div[field as keyof DividendItem] === undefined) {
            return fail(
              'md-div-format-3',
              'Each dividend has required fields',
              'format',
              `Required fields: ${strictlyRequired.join(', ')}`,
              `Missing or undefined field: ${field}`,
              'Each dividend must have ex_date and amount_per_share'
            );
          }
        }
      }
      return pass('md-div-format-3', 'Each dividend has required fields', 'format');
    },
  },

  // CORRECTNESS TESTS (4) - Note: These are format validations that accept unpredictable Yahoo Finance data
  {
    id: 'md-div-correct-1',
    name: 'ex_date <= payment_date (when both present)',
    category: 'correctness',
    description: 'Ex-dividend date should be on or before payment date when payment_date is available',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];

      for (const div of dividends) {
        // Skip validation if payment_date is null/undefined (Yahoo Finance sometimes doesn't have it)
        if (div.payment_date && div.ex_date > div.payment_date) {
          return fail(
            'md-div-correct-1',
            'ex_date <= payment_date (when both present)',
            'correctness',
            'ex_date <= payment_date',
            `ex_date=${div.ex_date}, payment_date=${div.payment_date}`,
            'Ex-date must be on or before payment date'
          );
        }
      }
      return pass('md-div-correct-1', 'ex_date <= payment_date (when both present)', 'correctness');
    },
  },
  {
    id: 'md-div-correct-2',
    name: 'Amount per share is positive',
    category: 'correctness',
    description: 'Dividend amount should be > 0',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];

      for (const div of dividends) {
        if (div.amount_per_share <= 0) {
          return fail(
            'md-div-correct-2',
            'Amount per share is positive',
            'correctness',
            'amount_per_share > 0',
            `amount_per_share = ${div.amount_per_share}`,
            'Dividend amounts should be positive'
          );
        }
      }
      return pass('md-div-correct-2', 'Amount per share is positive', 'correctness');
    },
  },
  {
    id: 'md-div-correct-3',
    name: 'Dividends in chronological order',
    category: 'correctness',
    description: 'Dividends should be ordered by ex_date',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];

      for (let i = 1; i < dividends.length; i++) {
        if (dividends[i].ex_date < dividends[i - 1].ex_date) {
          return fail(
            'md-div-correct-3',
            'Dividends in chronological order',
            'correctness',
            'Dates in ascending order',
            `${dividends[i - 1].ex_date} > ${dividends[i].ex_date}`,
            'Dividends should be sorted by ex_date'
          );
        }
      }
      return pass('md-div-correct-3', 'Dividends in chronological order', 'correctness');
    },
  },
  {
    id: 'md-div-correct-4',
    name: 'Reasonable dividend amounts',
    category: 'correctness',
    description: 'Dividend amounts should be reasonable (< $100/share)',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];

      for (const div of dividends) {
        if (div.amount_per_share > 100) {
          return fail(
            'md-div-correct-4',
            'Reasonable dividend amounts',
            'correctness',
            'amount_per_share < $100',
            `amount_per_share = $${div.amount_per_share}`,
            'Unusually high dividend amount detected'
          );
        }
      }
      return pass('md-div-correct-4', 'Reasonable dividend amounts', 'correctness');
    },
  },

  // EDGE CASE TESTS (3)
  {
    id: 'md-div-edge-1',
    name: 'Handles stocks with dividends',
    category: 'edge-case',
    description: 'Dividend-paying stock should return dividend data',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      // AAPL pays dividends, so we expect some data
      if (r.success && r.data?.dividends && r.data.dividends.length > 0) {
        return pass('md-div-edge-1', 'Handles stocks with dividends', 'edge-case');
      }
      return fail(
        'md-div-edge-1',
        'Handles stocks with dividends',
        'edge-case',
        'Non-empty dividends array for AAPL',
        `${r.data?.dividends?.length || 0} dividends`,
        'AAPL should have dividend data'
      );
    },
  },
  {
    id: 'md-div-edge-2',
    name: 'Date format is ISO 8601 (when present)',
    category: 'edge-case',
    description: 'Dates should be in YYYY-MM-DD format when available',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      for (const div of dividends) {
        // ex_date should always be present and valid
        if (!dateRegex.test(div.ex_date)) {
          return fail(
            'md-div-edge-2',
            'Date format is ISO 8601 (when present)',
            'edge-case',
            'YYYY-MM-DD',
            `ex_date=${div.ex_date}`,
            'ex_date should be in ISO 8601 format'
          );
        }
        // payment_date may be null from Yahoo Finance - only validate if present
        if (div.payment_date && !dateRegex.test(div.payment_date)) {
          return fail(
            'md-div-edge-2',
            'Date format is ISO 8601 (when present)',
            'edge-case',
            'YYYY-MM-DD',
            `payment_date=${div.payment_date}`,
            'payment_date should be in ISO 8601 format when present'
          );
        }
      }
      return pass('md-div-edge-2', 'Date format is ISO 8601 (when present)', 'edge-case');
    },
  },
  {
    id: 'md-div-edge-3',
    name: 'No duplicate ex_dates',
    category: 'edge-case',
    description: 'Each ex_date should appear only once',
    validate: (response) => {
      const r = response as ApiResponse<{ dividends: DividendItem[] }>;
      const dividends = r.data?.dividends || [];
      const dates = dividends.map(d => d.ex_date);
      const uniqueDates = new Set(dates);

      if (dates.length !== uniqueDates.size) {
        return fail(
          'md-div-edge-3',
          'No duplicate ex_dates',
          'edge-case',
          'All ex_dates unique',
          `${dates.length} dates, ${uniqueDates.size} unique`,
          'Found duplicate ex_dates in response'
        );
      }
      return pass('md-div-edge-3', 'No duplicate ex_dates', 'edge-case');
    },
  },
];

// Market Data Service Tests - /tickers/search endpoint
export const tickersSearchTests: TestCase[] = [
  {
    id: 'md-search-format-1',
    name: 'Response has success: true',
    category: 'format',
    description: 'Response should have success field set to true',
    validate: (response) => {
      const r = response as ApiResponse;
      if (r.success === true) {
        return pass('md-search-format-1', 'Response has success: true', 'format');
      }
      return fail(
        'md-search-format-1',
        'Response has success: true',
        'format',
        'success: true',
        `success: ${r.success}`,
        'Response should indicate success'
      );
    },
  },
  {
    id: 'md-search-format-2',
    name: 'Response has results array',
    category: 'format',
    description: 'Response data should contain a results array',
    validate: (response) => {
      const r = response as ApiResponse<{ results: unknown[] }>;
      if (r.data && Array.isArray(r.data.results)) {
        return pass('md-search-format-2', 'Response has results array', 'format');
      }
      return fail(
        'md-search-format-2',
        'Response has results array',
        'format',
        'data.results: Array',
        `data.results: ${typeof r.data?.results}`,
        'Response should contain results array'
      );
    },
  },
  {
    id: 'md-search-correct-1',
    name: 'Search returns relevant results',
    category: 'correctness',
    description: 'Searching for AAPL should return Apple',
    validate: (response) => {
      const r = response as ApiResponse<{ results: Array<{ ticker: string }> }>;
      const results = r.data?.results || [];

      const hasApple = results.some(res =>
        res.ticker === 'AAPL' || res.ticker?.toUpperCase() === 'AAPL'
      );

      if (hasApple) {
        return pass('md-search-correct-1', 'Search returns relevant results', 'correctness');
      }
      return fail(
        'md-search-correct-1',
        'Search returns relevant results',
        'correctness',
        'Results contain AAPL',
        `Found: ${results.map(r => r.ticker).join(', ') || 'none'}`,
        'AAPL search should return Apple'
      );
    },
  },
];
