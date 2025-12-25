# Metrics Service

## Overview

The Metrics Service calculates **performance and risk metrics** for portfolio simulations. It computes industry-standard financial metrics and comparisons between strategies.

**Port:** 8015
**Base URL:** `http://localhost:8015` (local) or `http://metrics:8015` (Docker network)

---

## Your Task

Implement the following endpoint. The service skeleton already exists with a working `/health` endpoint.

---

## Endpoint to Implement

### `POST /calculate`

Calculates all metrics for one or more portfolio simulations.

**Request Body:**

```json
{
  "risk_free_rate_annual": 0.02,
  "portfolios": {
    "active": {
      "time_series": {
        "dates": ["2020-01-02", "2020-01-03", "2020-01-06"],
        "portfolio_value": [50000, 50000, 50117.50]
      },
      "final_state": {
        "portfolio_value": 72562.50,
        "total_invested": 15000.00
      }
    },
    "baseline": {
      "time_series": {
        "dates": ["2020-01-02", "2020-01-03", "2020-01-06"],
        "portfolio_value": [50000, 50250, 50500]
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

---

## Metrics to Calculate

### Return Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| `total_return_pct` | `(final_value - initial_value) / initial_value * 100` | Total percentage return |
| `annualized_return_pct` | `((final / initial) ^ (365 / days) - 1) * 100` | CAGR - Compound Annual Growth Rate |

```python
# Total Return
total_return = (final_value - initial_value) / initial_value

# Annualized Return (CAGR)
days = (end_date - start_date).days
annualized_return = (final_value / initial_value) ** (365 / days) - 1
```

### Risk Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| `max_drawdown_pct` | See below | Largest peak-to-trough decline |
| `max_drawdown_duration_days` | See below | Longest time to recover from a drawdown |
| `volatility_annualized_pct` | `std(daily_returns) * sqrt(252) * 100` | Annualized standard deviation |

```python
# Daily Returns
daily_returns = []
for i in range(1, len(portfolio_values)):
    ret = (portfolio_values[i] - portfolio_values[i-1]) / portfolio_values[i-1]
    daily_returns.append(ret)

# Volatility (annualized)
import numpy as np
volatility = np.std(daily_returns) * np.sqrt(252)

# Max Drawdown
peak = portfolio_values[0]
max_drawdown = 0
for value in portfolio_values:
    if value > peak:
        peak = value
    drawdown = (peak - value) / peak
    if drawdown > max_drawdown:
        max_drawdown = drawdown
```

### Risk-Adjusted Returns

| Metric | Formula | Description |
|--------|---------|-------------|
| `sharpe_ratio` | `(return - risk_free) / volatility` | Risk-adjusted return |
| `sortino_ratio` | `(return - risk_free) / downside_volatility` | Downside risk-adjusted return |
| `calmar_ratio` | `annualized_return / abs(max_drawdown)` | Return per unit of drawdown |

```python
# Sharpe Ratio
excess_return = annualized_return - risk_free_rate
sharpe = excess_return / volatility

# Sortino Ratio (only count negative returns for volatility)
negative_returns = [r for r in daily_returns if r < 0]
downside_vol = np.std(negative_returns) * np.sqrt(252) if negative_returns else 0
sortino = excess_return / downside_vol if downside_vol > 0 else 0

# Calmar Ratio
calmar = annualized_return / abs(max_drawdown) if max_drawdown > 0 else 0
```

### Comparison Metrics

| Metric | Formula |
|--------|---------|
| `excess_return_pct` | `active.total_return - baseline.total_return` |
| `excess_annualized_return_pct` | `active.annualized_return - baseline.annualized_return` |
| `excess_sharpe` | `active.sharpe - baseline.sharpe` |
| `reduced_max_drawdown_pct` | `baseline.max_drawdown - active.max_drawdown` |
| `reduced_volatility_pct` | `baseline.volatility - active.volatility` |

---

## Edge Cases to Handle

1. **Division by Zero**: Volatility or drawdown could be zero
   - Return 0 for ratios when denominator is 0

2. **Single Data Point**: Can't calculate returns with only one value
   - Return zeros for all metrics

3. **Negative Returns**: All metrics should handle negative total returns correctly

4. **Short Time Periods**: Annualization might be misleading for very short periods
   - Still calculate, but the values will be extrapolated

---

## Error Handling

Return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Portfolio time_series cannot be empty",
    "details": {}
  }
}
```

---

## Implementation Tips

1. Use **numpy** for efficient numerical calculations
2. Create separate calculator functions for each metric category:
   - `calculate_returns()`
   - `calculate_risk()`
   - `calculate_ratios()`
   - `calculate_comparison()`

3. All percentages should be returned as floats (e.g., 45.13 not 0.4513)

---

## Reference Implementation

See `services/test-data-fetcher/app/main.py` for a working FastAPI service example.

---

## Files to Modify

```
services/metrics/
├── app/
│   ├── main.py           # Add routes
│   ├── routes/           # Create this folder
│   │   └── calculate.py  # /calculate endpoint
│   ├── calculators/      # Create this folder
│   │   ├── returns.py    # Return metrics
│   │   ├── risk.py       # Risk metrics (drawdown, volatility)
│   │   └── comparison.py # Comparison between strategies
│   └── schemas/          # Create this folder
│       └── models.py     # Pydantic models
└── requirements.txt      # numpy is already included
```

---

## Do NOT Modify

- `docker-compose.yml`
- `Dockerfile` (unless adding system dependencies)
- Other service folders
