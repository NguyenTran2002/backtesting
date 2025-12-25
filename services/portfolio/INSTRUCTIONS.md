# Portfolio Service

## Overview

The Portfolio Service **simulates trade execution** and tracks portfolio state over time. It takes trading signals and price data, then models how a portfolio would evolve following those signals.

**Port:** 8014
**Base URL:** `http://localhost:8014` (local) or `http://portfolio:8014` (Docker network)

---

## Your Task

Implement the following endpoint. The service skeleton already exists with a working `/health` endpoint.

---

## Endpoint to Implement

### `POST /simulate`

Simulates portfolio evolution based on signals, prices, and capital rules.

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
    },
    {
      "date": "2020-01-06",
      "adjusted_close": 100.00
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
      "total_shares": 1.175,
      "cash_balance": 49900.00,
      "holdings_value": 117.50,
      "portfolio_value": 50017.50,
      "total_invested": 100.00,
      "total_dividends_received": 0.00,
      "total_transaction_costs": 0.00
    }
  }
}
```

---

## Simulation Logic

### Daily Loop

For each day in `price_data`:

```python
for day in price_data:
    # 1. Check for dividend on this day
    if day.date in dividend_dates:
        dividend_payment = shares_held * dividend_amount
        if reinvest_dividends:
            # Buy more shares with dividend
            new_shares = dividend_payment / day.adjusted_close
            shares_held += new_shares
        else:
            cash_balance += dividend_payment
        total_dividends += dividend_payment

    # 2. Check for buy signal on this day
    if day.date in signal_dates and signal.action == "BUY":
        if cash_balance >= investment_per_trade:
            # Execute buy
            cost = investment_per_trade
            transaction_cost = cost * transaction_cost_pct
            net_investment = cost - transaction_cost
            shares_bought = net_investment / day.adjusted_close

            shares_held += shares_bought
            cash_balance -= cost
            total_invested += cost

            # Record trade
            trades.append({...})

    # 3. Record daily state
    holdings_value = shares_held * day.adjusted_close
    portfolio_value = cash_balance + holdings_value

    time_series.dates.append(day.date)
    time_series.portfolio_value.append(portfolio_value)
    # ... etc
```

### Key Formulas

| Calculation | Formula |
|-------------|---------|
| Shares bought | `investment_amount / price` |
| Holdings value | `shares_held * current_price` |
| Portfolio value | `cash_balance + holdings_value` |
| Transaction cost | `trade_amount * transaction_cost_pct` |

---

## Edge Cases to Handle

1. **Insufficient Cash**: If `cash_balance < investment_per_trade`, skip the buy signal (don't partial fill)

2. **Signal on Non-Trading Day**: Signals should only exist on dates that appear in `price_data`. If a signal date doesn't match, skip it.

3. **Dividend Reinvestment**: When `reinvest_dividends: true`, use the dividend cash to buy shares at that day's price.

4. **Cash Interest** (optional): If `cash_interest_rate_pct > 0`, apply daily interest to cash balance:
   ```python
   daily_rate = (1 + annual_rate) ** (1/252) - 1
   cash_balance *= (1 + daily_rate)
   ```

---

## Error Handling

Return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "initial_capital must be positive",
    "details": {}
  }
}
```

Common error codes:
- `INVALID_REQUEST` - Missing or invalid parameters
- `INSUFFICIENT_DATA` - Price data is empty

---

## Reference Implementation

See `services/test-data-fetcher/app/main.py` for a working FastAPI service example.

---

## Files to Modify

```
services/portfolio/
├── app/
│   ├── main.py           # Add routes
│   ├── routes/           # Create this folder
│   │   └── simulate.py   # /simulate endpoint
│   ├── engine/           # Create this folder
│   │   └── simulator.py  # Core simulation logic
│   └── schemas/          # Create this folder
│       └── models.py     # Pydantic models
└── requirements.txt      # Add any new dependencies
```

---

## Do NOT Modify

- `docker-compose.yml`
- `Dockerfile` (unless adding system dependencies)
- Other service folders
