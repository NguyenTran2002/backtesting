# Market Data Service

## Overview

The Market Data Service fetches **historical price and dividend data** from external sources (Yahoo Finance via yfinance). It provides clean, normalized data to other services.

**Port:** 8012
**Base URL:** `http://localhost:8012` (local) or `http://market-data:8012` (Docker network)

---

## Your Task

Implement the following endpoints. The service skeleton already exists with a working `/health` endpoint.

---

## Endpoints to Implement

### 1. `POST /prices`

Retrieves OHLCV (Open, High, Low, Close, Volume) price data for a ticker.

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
      }
    ]
  }
}
```

**Implementation Notes:**
- Use `yfinance.download()` or `yfinance.Ticker().history()`
- The `adjusted_close` field is critical - it accounts for splits and dividends
- Format dates as ISO strings (YYYY-MM-DD)
- Convert numpy types to Python native types for JSON serialization

---

### 2. `POST /dividends`

Retrieves dividend history for a ticker.

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
      }
    ]
  }
}
```

**Implementation Notes:**
- Use `yfinance.Ticker().dividends`
- `payment_date` may not always be available - use `null` if missing
- Some tickers (especially leveraged ETFs) may have no dividends - return empty array

---

### 3. `GET /tickers/search?q={query}`

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

**Implementation Notes:**
- Use `yfinance.Ticker().info` to get ticker details
- This endpoint is optional for MVP - can return a simple validation check instead

---

## Error Handling

Return errors in this format:

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

Common error codes:
- `INVALID_TICKER` - Ticker symbol not found
- `INVALID_DATE_RANGE` - End date before start date
- `EXTERNAL_API_ERROR` - Yahoo Finance API failed

---

## yfinance Usage Examples

```python
import yfinance as yf

# Get price history
ticker = yf.Ticker("TQQQ")
hist = ticker.history(start="2020-01-01", end="2022-01-01")
# Returns DataFrame with columns: Open, High, Low, Close, Volume, Dividends, Stock Splits

# Get dividends only
divs = ticker.dividends
# Returns Series with date index and dividend amounts

# Get ticker info
info = ticker.info
# Returns dict with name, sector, etc.
```

---

## Reference Implementation

See `services/test-data-fetcher/app/main.py` - it already implements similar functionality for test data. You can use it as a starting point.

---

## Files to Modify

```
services/market-data/
├── app/
│   ├── main.py           # Add routes
│   ├── routes/           # Create this folder
│   │   ├── prices.py     # /prices endpoint
│   │   └── dividends.py  # /dividends endpoint
│   ├── providers/        # Create this folder
│   │   ├── base.py       # Abstract provider interface (optional)
│   │   └── yahoo.py      # yfinance implementation
│   └── schemas/          # Create this folder
│       └── models.py     # Pydantic models
└── requirements.txt      # yfinance is already included
```

---

## Do NOT Modify

- `docker-compose.yml`
- `Dockerfile` (unless adding system dependencies)
- Other service folders
