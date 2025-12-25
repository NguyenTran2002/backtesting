# Orchestrator Service

## Overview

The Orchestrator is the **API gateway** for the backtesting platform. It receives requests from the frontend and coordinates all downstream services to execute a complete backtest.

**Port:** 8011
**Base URL:** `http://localhost:8011` (local) or `http://orchestrator:8011` (Docker network)

---

## Your Task

Implement the following endpoints. The service skeleton already exists with a working `/health` endpoint.

---

## Endpoints to Implement

### 1. `POST /api/backtest`

This is the main endpoint. It orchestrates the entire backtest flow.

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
  }
}
```

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
      "summary": { ... },
      "time_series": { ... },
      "trades": [ ... ]
    },
    "baseline_strategy": {
      "summary": { ... },
      "time_series": { ... }
    },
    "comparison": {
      "excess_return_pct": 6.7,
      "excess_sharpe": 0.23,
      "reduced_drawdown_pct": 9.9
    }
  }
}
```

See `ARCHITECTURE.md` in the repository root for the complete response schema.

---

### 2. `GET /api/health` (Enhanced)

The current `/health` endpoint only returns the orchestrator's status. Enhance it to check all downstream services.

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

## Orchestration Flow

When `/api/backtest` is called, execute these steps in order:

```
1. VALIDATE request parameters

2. FETCH market data (parallel calls)
   POST http://market-data:8012/prices
   POST http://market-data:8012/dividends

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

Use `httpx` with `asyncio.gather()` for parallel requests where noted.

---

## Service URLs (Environment Variables)

These are already configured in `docker-compose.yml`:

| Variable | Default Value |
|----------|---------------|
| `MARKET_DATA_URL` | `http://market-data:8012` |
| `STRATEGY_URL` | `http://strategy:8013` |
| `PORTFOLIO_URL` | `http://portfolio:8014` |
| `METRICS_URL` | `http://metrics:8015` |

Access them via `os.environ.get("MARKET_DATA_URL")`.

---

## Error Handling

Wrap downstream service calls in try/except. Return errors in this format:

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

---

## Reference Implementation

See `services/test-data-fetcher/app/main.py` for a working FastAPI service example with proper response formatting.

---

## Files to Modify

```
services/orchestrator/
├── app/
│   ├── main.py          # Add routes, CORS already configured
│   ├── routes/          # Create this folder
│   │   └── backtest.py  # Main backtest endpoint logic
│   ├── schemas/         # Create this folder
│   │   ├── requests.py  # Pydantic models for request validation
│   │   └── responses.py # Pydantic models for responses
│   └── clients/         # Create this folder
│       ├── market_data.py
│       ├── strategy.py
│       ├── portfolio.py
│       └── metrics.py
└── requirements.txt     # Add any new dependencies
```

---

## Do NOT Modify

- `docker-compose.yml`
- `Dockerfile` (unless adding system dependencies)
- Other service folders
