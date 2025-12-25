# Strategy Service

## Overview

The Strategy Service generates **buy/sell signals** based on price data and strategy parameters. It implements the trading logic that determines when to execute trades.

**Port:** 8013
**Base URL:** `http://localhost:8013` (local) or `http://strategy:8013` (Docker network)

---

## Your Task

Implement the following endpoint and strategies. The service skeleton already exists with a working `/health` endpoint.

---

## Endpoint to Implement

### `POST /signals`

Analyzes price data and generates trading signals based on the specified strategy.

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
      }
    ],
    "total_signals": 1
  }
}
```

---

## Strategies to Implement

### 1. `buy_the_dip` (Required)

Generates a BUY signal when the price drops by a specified percentage.

**Config Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `price_change_threshold` | float | Negative percentage (e.g., -0.05 for -5%) |
| `lookback_period` | string | `"daily"`, `"weekly"`, or `"monthly"` |

**Logic:**
```python
# For daily lookback:
price_change = (today_close - yesterday_close) / yesterday_close

if price_change <= price_change_threshold:
    generate_buy_signal()
```

**For weekly/monthly lookback:**
- Weekly: Compare to close from 5 trading days ago
- Monthly: Compare to close from 21 trading days ago

---

### 2. `buy_and_hold` (Required)

Generates a single BUY signal on the first day. Used as the baseline strategy.

**Config Parameters:** None

**Logic:**
```python
# Generate one signal on the first day of price_data
signals = [{
    "date": price_data[0]["date"],
    "action": "BUY",
    "price": price_data[0]["adjusted_close"],
    "trigger_details": {
        "reason": "Initial buy for buy-and-hold strategy"
    }
}]
```

---

### 3. `dollar_cost_average` (Future - Optional)

Generates BUY signals at regular intervals.

**Config Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `frequency` | string | `"daily"`, `"weekly"`, `"monthly"` |

---

## Error Handling

Return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "STRATEGY_NOT_FOUND",
    "message": "Unknown strategy type: 'invalid_strategy'",
    "details": {
      "supported_strategies": ["buy_the_dip", "buy_and_hold"]
    }
  }
}
```

Common error codes:
- `STRATEGY_NOT_FOUND` - Unknown strategy type
- `INVALID_CONFIG` - Missing or invalid config parameters
- `INSUFFICIENT_DATA` - Not enough price data for lookback period

---

## Implementation Tips

1. **Strategy Pattern**: Use a base class/interface for strategies to make adding new ones easy:

```python
class BaseStrategy:
    def generate_signals(self, price_data: list, config: dict) -> list:
        raise NotImplementedError

class BuyTheDip(BaseStrategy):
    def generate_signals(self, price_data: list, config: dict) -> list:
        # Implementation here
        pass
```

2. **Date Handling**: The `price_data` is already sorted chronologically. Iterate through it to detect triggers.

3. **Edge Cases**:
   - First day has no previous day for comparison
   - Weekends/holidays create gaps in trading days

---

## Reference Implementation

See `services/test-data-fetcher/app/main.py` for a working FastAPI service example.

---

## Files to Modify

```
services/strategy/
├── app/
│   ├── main.py           # Add routes
│   ├── routes/           # Create this folder
│   │   └── signals.py    # /signals endpoint
│   ├── strategies/       # Create this folder
│   │   ├── base.py       # Base strategy class
│   │   ├── buy_the_dip.py
│   │   └── buy_and_hold.py
│   └── schemas/          # Create this folder
│       └── models.py     # Pydantic models
└── requirements.txt      # Add any new dependencies
```

---

## Do NOT Modify

- `docker-compose.yml`
- `Dockerfile` (unless adding system dependencies)
- Other service folders
