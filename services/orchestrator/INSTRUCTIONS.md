# Orchestrator Service

## Overview

The Orchestrator is the **API gateway** for the backtesting platform. It receives requests from the frontend and coordinates all downstream services to execute a complete backtest.

**Port:** 8011
**Base URL:** `http://localhost:8011` (local) or `http://orchestrator:8011` (Docker network)

---

## Endpoints

### 1. `POST /api/backtest`

Executes a complete backtest by orchestrating all downstream services.

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

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `market_params` | object | Yes | Ticker and date range configuration |
| `strategy_params` | object | Yes | Strategy type and configuration |
| `portfolio_params` | object | Yes | Capital and trading rules for active strategy |
| `baseline_params` | object | Yes | Capital settings for buy-and-hold baseline |
| `use_test_data` | boolean | No | When `true`, uses test-data-fetcher instead of live market data. Default: `false` |

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
      "signals": [...],
      "portfolio": {
        "time_series": {...},
        "trades": [...],
        "final_state": {...}
      },
      "metrics": {...}
    },
    "baseline": {
      "portfolio": {
        "time_series": {...},
        "final_state": {...}
      },
      "metrics": {...}
    },
    "market_data": {
      "ticker": "TQQQ",
      "prices": [...],
      "dividends": [...]
    },
    "comparison": {
      "excess_return_pct": 6.7,
      "excess_sharpe": 0.23,
      "reduced_max_drawdown_pct": 9.9
    }
  }
}
```

---

### 2. `GET /api/health`

Enhanced health check that verifies all downstream services.

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

### 3. `GET /health`

Basic health check for Docker.

**Response:**

```json
{
  "status": "healthy",
  "service": "orchestrator"
}
```

---

## Test Mode

The `use_test_data` flag enables testing with deterministic data:

| Mode | `use_test_data` | Data Source | Use Case |
|------|-----------------|-------------|----------|
| Normal | `false` (default) | market-data service (live Yahoo Finance) | Production, real backtests |
| Test | `true` | test-data-fetcher (static fixtures) | Frontend testing, CI/CD |

**Test data includes:**
- 20 trading days of AAPL prices (January 2024)
- A -6% price dip on day 5 (triggers buy_the_dip with -5% threshold)
- 4 quarterly dividends

---

## Orchestration Flow

```
1. VALIDATE request parameters

2. FETCH market data (parallel calls)
   POST http://market-data:8012/prices    (or test-data-fetcher:8016 if use_test_data)
   POST http://market-data:8012/dividends (or test-data-fetcher:8016 if use_test_data)

3. GENERATE signals (parallel calls)
   POST http://strategy:8013/signals  (active strategy)
   POST http://strategy:8013/signals  (baseline: buy_and_hold)

4. SIMULATE portfolios (parallel calls)
   POST http://portfolio:8014/simulate  (active)
   POST http://portfolio:8014/simulate  (baseline)

5. CALCULATE metrics
   POST http://metrics:8015/calculate

6. ASSEMBLE and return final response
```

---

## Project Structure

```
services/orchestrator/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── routes/
│   │   └── backtest.py      # POST /api/backtest, GET /api/health
│   ├── schemas/
│   │   ├── requests.py      # Pydantic request models
│   │   └── responses.py     # Pydantic response models
│   └── clients/
│       ├── base.py          # Base HTTP client with error handling
│       ├── market_data.py   # Market data service client
│       ├── strategy.py      # Strategy service client
│       ├── portfolio.py     # Portfolio service client
│       └── metrics.py       # Metrics service client
├── Dockerfile
├── requirements.txt
└── INSTRUCTIONS.md          # This file
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Market Data Service is not responding",
    "details": {}
  }
}
```

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `INVALID_TICKER` | 400 | Ticker symbol not found |
| `INSUFFICIENT_DATA` | 400 | Not enough price data for analysis |
| `SERVICE_UNAVAILABLE` | 503 | Downstream service unreachable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
