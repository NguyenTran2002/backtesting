# Backtesting Platform - Backend Architecture

## Overview

This document defines the microservices architecture for a trading strategy backtesting platform. The system allows users to backtest investment strategies (starting with "Buy the Dip") against historical market data and compare performance against a baseline buy-and-hold strategy.

### Technology Stack

| Component | Technology |
|-----------|------------|
| Backend Services | Python + FastAPI |
| Market Data | yfinance (Yahoo Finance API) |
| Database | Supabase (PostgreSQL) - optional, for future caching |
| Containerization | Docker + Docker Compose |
| Frontend | React (out of scope for this document) |

### Data Strategy

The platform uses **on-demand data fetching** via yfinance:

- **Current Approach**: When a user requests a backtest, the Market Data Service fetches historical data directly from Yahoo Finance. This provides real-time access without requiring database infrastructure.
- **Performance**: Typical fetch time is 1-2 seconds per ticker for daily data (acceptable for interactive use).
- **Future Enhancement**: A Supabase caching layer can be added to store frequently-requested data, reducing API calls and improving response times.

---

## Service Architecture

```
                                    ┌──────────────────┐
                                    │     Frontend     │
                                    │      (React)     │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │   Orchestrator   │
                                    │     Service      │
                                    │    :8011/api     │
                                    └────────┬─────────┘
                                             │
                ┌────────────────┬───────────┼───────────┬────────────────┐
                │                │           │           │                │
                ▼                ▼           ▼           ▼                ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Market Data  │ │   Strategy   │ │  Portfolio   │ │   Metrics    │
        │   Service    │ │   Service    │ │   Service    │ │   Service    │
        │    :8012     │ │    :8013     │ │    :8014     │ │    :8015     │
        └──────┬───────┘ └──────────────┘ └──────────────┘ └──────────────┘
               │
               ▼
        ┌──────────────┐      ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐
        │   yfinance   │         Supabase
        │  (Yahoo API) │──────│  (PostgreSQL)  │
        └──────────────┘         [Optional]
                              └ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

## Service Contracts

### 1. Orchestrator Service

The single entry point for the frontend. Coordinates all other services to execute a complete backtest.

**Base URL:** `http://orchestrator:8011`

#### Endpoints

##### `POST /api/backtest`

Executes a complete backtest with the active strategy and baseline comparison.

**Request Body:**

```json
{
  "market_params": {
    "ticker": "TQQQ",
    "market_type": "ETF",
    "start_date": "2020-01-01",
    "end_date": "2022-01-01",
    "frequency": "daily"
  },
  "strategy_params": {
    "strategy_type": "buy_the_dip",
    "config": {
      "price_change_threshold": -0.05,
      "lookback_period": "daily"
    }
  },
  "portfolio_params": {
    "initial_capital": 50000,
    "investment_per_trade": 100,
    "reinvest_dividends": true,
    "transaction_cost_pct": 0,
    "cash_interest_rate_pct": 0
  },
  "baseline_params": {
    "initial_capital": 50000,
    "reinvest_dividends": true
  },
  "use_test_data": false
}
```

**Optional Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `use_test_data` | boolean | `false` | When `true`, uses test-data-fetcher service instead of live market data. Useful for frontend testing with deterministic results. |

**Response Body:**

```json
{
  "success": true,
  "data": {
    "metadata": {
      "ticker": "TQQQ",
      "start_date": "2020-01-01",
      "end_date": "2022-01-01",
      "strategy_type": "buy_the_dip",
      "execution_time_ms": 1234
    },
    "active_strategy": {
      "summary": {
        "total_return_pct": 45.2,
        "annualized_return_pct": 20.1,
        "final_portfolio_value": 72600,
        "total_capital_invested": 15000,
        "max_drawdown_pct": -35.2,
        "volatility_annualized_pct": 42.1,
        "sharpe_ratio": 0.85,
        "total_trades": 150
      },
      "time_series": {
        "dates": ["2020-01-01", "2020-01-02", "..."],
        "portfolio_value": [50000, 50000, "..."],
        "holdings_value": [0, 100, "..."],
        "cash_balance": [50000, 49900, "..."],
        "cumulative_invested": [0, 100, "..."]
      },
      "trades": [
        {
          "date": "2020-01-03",
          "action": "BUY",
          "ticker": "TQQQ",
          "shares": 1.5,
          "price": 66.67,
          "amount": 100,
          "trigger": "Price dropped -5.2% from previous day"
        }
      ]
    },
    "baseline_strategy": {
      "summary": {
        "total_return_pct": 38.5,
        "annualized_return_pct": 17.2,
        "final_portfolio_value": 69250,
        "total_capital_invested": 50000,
        "max_drawdown_pct": -45.1,
        "volatility_annualized_pct": 48.3,
        "sharpe_ratio": 0.62
      },
      "time_series": {
        "dates": ["2020-01-01", "2020-01-02", "..."],
        "portfolio_value": [50000, 50250, "..."]
      }
    },
    "comparison": {
      "excess_return_pct": 6.7,
      "excess_sharpe": 0.23,
      "reduced_drawdown_pct": 9.9
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TICKER",
    "message": "Ticker 'XYZ123' not found",
    "details": {}
  }
}
```

---

##### `GET /api/health`

Health check endpoint for Docker.

**Response:**

```json
{
  "status": "healthy",
  "services": {
    "market_data": "healthy",
    "strategy": "healthy",
    "portfolio": "healthy",
    "metrics": "healthy"
  }
}
```

---

### 2. Market Data Service

Fetches historical price and dividend data from external sources.

**Base URL:** `http://market-data:8012`

#### Endpoints

##### `POST /prices`

Retrieves OHLCV price data for a given ticker and date range.

**Request Body:**

```json
{
  "ticker": "TQQQ",
  "market_type": "ETF",
  "start_date": "2020-01-01",
  "end_date": "2022-01-01",
  "frequency": "daily"
}
```

**Response Body:**

```json
{
  "success": true,
  "data": {
    "ticker": "TQQQ",
    "frequency": "daily",
    "prices": [
      {
        "date": "2020-01-02",
        "open": 89.50,
        "high": 90.25,
        "low": 88.10,
        "close": 89.75,
        "adjusted_close": 89.75,
        "volume": 15000000
      },
      {
        "date": "2020-01-03",
        "open": 89.00,
        "high": 89.50,
        "low": 85.00,
        "close": 85.10,
        "adjusted_close": 85.10,
        "volume": 22000000
      }
    ]
  }
}
```

---

##### `POST /dividends`

Retrieves dividend history for a given ticker.

**Request Body:**

```json
{
  "ticker": "TQQQ",
  "start_date": "2020-01-01",
  "end_date": "2022-01-01"
}
```

**Response Body:**

```json
{
  "success": true,
  "data": {
    "ticker": "TQQQ",
    "dividends": [
      {
        "ex_date": "2020-03-20",
        "payment_date": "2020-03-25",
        "amount_per_share": 0.052
      },
      {
        "ex_date": "2020-06-19",
        "payment_date": "2020-06-24",
        "amount_per_share": 0.048
      }
    ]
  }
}
```

---

##### `GET /tickers/search?q={query}`

Searches for tickers by name or symbol.

**Response Body:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "ticker": "TQQQ",
        "name": "ProShares UltraPro QQQ",
        "market_type": "ETF",
        "exchange": "NASDAQ"
      }
    ]
  }
}
```

---

### 3. Strategy Service

Generates buy/sell signals based on price data and strategy parameters.

**Base URL:** `http://strategy:8013`

#### Endpoints

##### `POST /signals`

Analyzes price data and generates trading signals.

**Request Body:**

```json
{
  "strategy_type": "buy_the_dip",
  "config": {
    "price_change_threshold": -0.05,
    "lookback_period": "daily"
  },
  "price_data": [
    {
      "date": "2020-01-02",
      "adjusted_close": 89.75
    },
    {
      "date": "2020-01-03",
      "adjusted_close": 85.10
    }
  ]
}
```

**Response Body:**

```json
{
  "success": true,
  "data": {
    "strategy_type": "buy_the_dip",
    "signals": [
      {
        "date": "2020-01-03",
        "action": "BUY",
        "price": 85.10,
        "trigger_details": {
          "price_change_pct": -5.18,
          "threshold_pct": -5.0,
          "previous_close": 89.75
        }
      },
      {
        "date": "2020-03-12",
        "action": "BUY",
        "price": 32.50,
        "trigger_details": {
          "price_change_pct": -12.4,
          "threshold_pct": -5.0,
          "previous_close": 37.10
        }
      }
    ],
    "total_signals": 2
  }
}
```

#### Supported Strategy Types

| Strategy Type | Config Parameters |
|---------------|-------------------|
| `buy_the_dip` | `price_change_threshold` (float), `lookback_period` (daily/weekly/monthly) |
| `buy_and_hold` | None (single buy on first day) |
| `momentum` | (Future) `momentum_threshold`, `lookback_days` |
| `dollar_cost_average` | (Future) `frequency`, `amount` |

---

### 4. Portfolio Service

Simulates trade execution and tracks portfolio state over time.

**Base URL:** `http://portfolio:8014`

#### Endpoints

##### `POST /simulate`

Simulates portfolio evolution based on signals and capital rules.

**Request Body:**

```json
{
  "initial_capital": 50000,
  "investment_per_trade": 100,
  "reinvest_dividends": true,
  "transaction_cost_pct": 0,
  "cash_interest_rate_pct": 0,
  "signals": [
    {
      "date": "2020-01-03",
      "action": "BUY",
      "price": 85.10
    }
  ],
  "price_data": [
    {
      "date": "2020-01-02",
      "adjusted_close": 89.75
    },
    {
      "date": "2020-01-03",
      "adjusted_close": 85.10
    }
  ],
  "dividend_data": [
    {
      "ex_date": "2020-03-20",
      "amount_per_share": 0.052
    }
  ]
}
```

**Response Body:**

```json
{
  "success": true,
  "data": {
    "time_series": {
      "dates": ["2020-01-02", "2020-01-03", "2020-01-06"],
      "portfolio_value": [50000.00, 50000.00, 50117.50],
      "holdings_value": [0.00, 100.00, 117.50],
      "cash_balance": [50000.00, 49900.00, 49900.00],
      "shares_held": [0.00, 1.175, 1.175],
      "cumulative_invested": [0.00, 100.00, 100.00],
      "cumulative_dividends": [0.00, 0.00, 0.00]
    },
    "trades": [
      {
        "date": "2020-01-03",
        "action": "BUY",
        "ticker": "TQQQ",
        "shares": 1.175,
        "price": 85.10,
        "amount": 100.00,
        "transaction_cost": 0.00
      }
    ],
    "final_state": {
      "total_shares": 150.25,
      "cash_balance": 35000.00,
      "holdings_value": 37562.50,
      "portfolio_value": 72562.50,
      "total_invested": 15000.00,
      "total_dividends_received": 125.40,
      "total_transaction_costs": 0.00
    }
  }
}
```

---

### 5. Metrics Service

Calculates performance and risk metrics for portfolio results.

**Base URL:** `http://metrics:8015`

#### Endpoints

##### `POST /calculate`

Calculates all metrics for one or more portfolio simulations.

**Request Body:**

```json
{
  "risk_free_rate_annual": 0.02,
  "portfolios": {
    "active": {
      "time_series": {
        "dates": ["2020-01-02", "2020-01-03", "..."],
        "portfolio_value": [50000, 50000, "..."]
      },
      "final_state": {
        "portfolio_value": 72562.50,
        "total_invested": 15000.00
      }
    },
    "baseline": {
      "time_series": {
        "dates": ["2020-01-02", "2020-01-03", "..."],
        "portfolio_value": [50000, 50250, "..."]
      },
      "final_state": {
        "portfolio_value": 69250.00,
        "total_invested": 50000.00
      }
    }
  },
  "start_date": "2020-01-01",
  "end_date": "2022-01-01"
}
```

**Response Body:**

```json
{
  "success": true,
  "data": {
    "active": {
      "total_return_pct": 45.13,
      "annualized_return_pct": 20.08,
      "max_drawdown_pct": -35.2,
      "max_drawdown_duration_days": 45,
      "volatility_annualized_pct": 42.1,
      "sharpe_ratio": 0.85,
      "sortino_ratio": 1.12,
      "calmar_ratio": 0.57
    },
    "baseline": {
      "total_return_pct": 38.50,
      "annualized_return_pct": 17.21,
      "max_drawdown_pct": -45.1,
      "max_drawdown_duration_days": 62,
      "volatility_annualized_pct": 48.3,
      "sharpe_ratio": 0.62,
      "sortino_ratio": 0.81,
      "calmar_ratio": 0.38
    },
    "comparison": {
      "excess_return_pct": 6.63,
      "excess_annualized_return_pct": 2.87,
      "excess_sharpe": 0.23,
      "reduced_max_drawdown_pct": 9.9,
      "reduced_volatility_pct": 6.2
    }
  }
}
```

#### Metrics Definitions

| Metric | Description |
|--------|-------------|
| `total_return_pct` | (Final Value - Initial Capital) / Initial Capital x 100 |
| `annualized_return_pct` | CAGR - Compound Annual Growth Rate |
| `max_drawdown_pct` | Largest peak-to-trough decline |
| `volatility_annualized_pct` | Standard deviation of returns, annualized |
| `sharpe_ratio` | (Return - Risk Free Rate) / Volatility |
| `sortino_ratio` | (Return - Risk Free Rate) / Downside Volatility |
| `calmar_ratio` | Annualized Return / Max Drawdown |

---

## Complete Data Flow Example

This example traces a full backtest request through all services.

### Scenario

User wants to backtest "Buy the Dip" strategy on TQQQ from 2020-01-01 to 2022-01-01, buying $100 worth whenever the price drops 5% or more in a day, starting with $50,000 capital.

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Frontend → Orchestrator                                             │
│                                                                             │
│ POST /api/backtest                                                          │
│ {                                                                           │
│   "market_params": { "ticker": "TQQQ", "start_date": "2020-01-01", ... },   │
│   "strategy_params": { "strategy_type": "buy_the_dip", "config": {...} },   │
│   "portfolio_params": { "initial_capital": 50000, ... },                    │
│   "baseline_params": { "initial_capital": 50000, ... }                      │
│ }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Orchestrator → Market Data Service                                  │
│                                                                             │
│ POST http://market-data:8012/prices                                         │
│ POST http://market-data:8012/dividends                                      │
│                                                                             │
│ Returns: 504 trading days of OHLCV data + 8 dividend records                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Orchestrator → Strategy Service (x2, parallel)                      │
│                                                                             │
│ REQUEST 1: Active Strategy                                                  │
│ POST http://strategy:8013/signals                                           │
│ { "strategy_type": "buy_the_dip", "config": {...}, "price_data": [...] }    │
│ Returns: 47 BUY signals                                                     │
│                                                                             │
│ REQUEST 2: Baseline Strategy                                                │
│ POST http://strategy:8013/signals                                           │
│ { "strategy_type": "buy_and_hold", "config": {}, "price_data": [...] }      │
│ Returns: 1 BUY signal (day 1)                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Orchestrator → Portfolio Service (x2, parallel)                     │
│                                                                             │
│ REQUEST 1: Active Strategy Simulation                                       │
│ POST http://portfolio:8014/simulate                                         │
│ {                                                                           │
│   "initial_capital": 50000,                                                 │
│   "investment_per_trade": 100,                                              │
│   "signals": [47 buy signals],                                              │
│   "price_data": [...],                                                      │
│   "dividend_data": [...]                                                    │
│ }                                                                           │
│ Returns: Daily portfolio values, trade log, final state                     │
│                                                                             │
│ REQUEST 2: Baseline Strategy Simulation                                     │
│ POST http://portfolio:8014/simulate                                         │
│ {                                                                           │
│   "initial_capital": 50000,                                                 │
│   "investment_per_trade": 50000,  // All-in on day 1                        │
│   "signals": [1 buy signal],                                                │
│   "price_data": [...],                                                      │
│   "dividend_data": [...]                                                    │
│ }                                                                           │
│ Returns: Daily portfolio values, final state                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Orchestrator → Metrics Service                                      │
│                                                                             │
│ POST http://metrics:8015/calculate                                          │
│ {                                                                           │
│   "portfolios": {                                                           │
│     "active": { time_series, final_state },                                 │
│     "baseline": { time_series, final_state }                                │
│   }                                                                         │
│ }                                                                           │
│ Returns: All metrics for both + comparison                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: Orchestrator → Frontend                                             │
│                                                                             │
│ Orchestrator assembles final response:                                      │
│ {                                                                           │
│   "success": true,                                                          │
│   "data": {                                                                 │
│     "metadata": {...},                                                      │
│     "active_strategy": { summary, time_series, trades },                    │
│     "baseline_strategy": { summary, time_series },                          │
│     "comparison": {...}                                                     │
│   }                                                                         │
│ }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sequence Diagram

```
Frontend    Orchestrator    MarketData    Strategy    Portfolio    Metrics
    │             │              │            │            │           │
    │──POST /backtest──►│        │            │            │           │
    │             │              │            │            │           │
    │             │──GET prices──►│           │            │           │
    │             │◄─price data──│            │            │           │
    │             │──GET divs────►│           │            │           │
    │             │◄─div data────│            │            │           │
    │             │              │            │            │           │
    │             │──────────POST signals (active)────────►│           │
    │             │──────────POST signals (baseline)──────►│           │
    │             │◄─────────────signals──────────────────│            │
    │             │              │            │            │           │
    │             │───────────────POST simulate (active)──────────────►│
    │             │───────────────POST simulate (baseline)────────────►│
    │             │◄──────────────portfolio results───────────────────│
    │             │              │            │            │           │
    │             │─────────────────────POST calculate────────────────►│
    │             │◄────────────────────metrics───────────────────────│
    │             │              │            │            │           │
    │◄──response──│              │            │            │           │
    │             │              │            │            │           │
```

---

## Error Handling Standards

All services follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `INVALID_TICKER` | 400 | Ticker symbol not found |
| `INVALID_DATE_RANGE` | 400 | End date before start date |
| `INSUFFICIENT_DATA` | 400 | Not enough price data for analysis |
| `STRATEGY_NOT_FOUND` | 400 | Unknown strategy type |
| `SERVICE_UNAVAILABLE` | 503 | Downstream service unreachable |
| `EXTERNAL_API_ERROR` | 502 | Data provider API failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
