from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Test Data Fetcher Service",
    description="Provides static sample market data for testing other services",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static test fixtures - deterministic data for reliable testing
# 20 trading days with a -6% dip on day 5 (for buy-the-dip strategy testing)
STATIC_PRICES = {
    "AAPL": [
        {"date": "2024-01-02", "open": 100.00, "high": 101.50, "low": 99.50, "close": 101.00, "adjusted_close": 101.00, "volume": 50000000},
        {"date": "2024-01-03", "open": 101.00, "high": 102.00, "low": 100.50, "close": 101.50, "adjusted_close": 101.50, "volume": 48000000},
        {"date": "2024-01-04", "open": 101.50, "high": 102.50, "low": 101.00, "close": 102.00, "adjusted_close": 102.00, "volume": 52000000},
        {"date": "2024-01-05", "open": 102.00, "high": 102.50, "low": 101.50, "close": 102.25, "adjusted_close": 102.25, "volume": 45000000},
        # Day 5: -6% dip (triggers buy_the_dip with -5% threshold)
        {"date": "2024-01-08", "open": 102.25, "high": 102.50, "low": 95.50, "close": 96.00, "adjusted_close": 96.00, "volume": 85000000},
        {"date": "2024-01-09", "open": 96.00, "high": 97.50, "low": 95.50, "close": 97.00, "adjusted_close": 97.00, "volume": 72000000},
        {"date": "2024-01-10", "open": 97.00, "high": 98.50, "low": 96.50, "close": 98.00, "adjusted_close": 98.00, "volume": 55000000},
        {"date": "2024-01-11", "open": 98.00, "high": 99.00, "low": 97.50, "close": 98.50, "adjusted_close": 98.50, "volume": 48000000},
        {"date": "2024-01-12", "open": 98.50, "high": 100.00, "low": 98.00, "close": 99.50, "adjusted_close": 99.50, "volume": 51000000},
        {"date": "2024-01-16", "open": 99.50, "high": 101.00, "low": 99.00, "close": 100.50, "adjusted_close": 100.50, "volume": 47000000},
        {"date": "2024-01-17", "open": 100.50, "high": 101.50, "low": 100.00, "close": 101.00, "adjusted_close": 101.00, "volume": 46000000},
        {"date": "2024-01-18", "open": 101.00, "high": 102.00, "low": 100.50, "close": 101.75, "adjusted_close": 101.75, "volume": 44000000},
        {"date": "2024-01-19", "open": 101.75, "high": 102.50, "low": 101.25, "close": 102.25, "adjusted_close": 102.25, "volume": 43000000},
        {"date": "2024-01-22", "open": 102.25, "high": 103.00, "low": 101.75, "close": 102.75, "adjusted_close": 102.75, "volume": 42000000},
        {"date": "2024-01-23", "open": 102.75, "high": 103.50, "low": 102.25, "close": 103.25, "adjusted_close": 103.25, "volume": 45000000},
        {"date": "2024-01-24", "open": 103.25, "high": 104.00, "low": 102.75, "close": 103.75, "adjusted_close": 103.75, "volume": 48000000},
        {"date": "2024-01-25", "open": 103.75, "high": 104.50, "low": 103.25, "close": 104.25, "adjusted_close": 104.25, "volume": 47000000},
        {"date": "2024-01-26", "open": 104.25, "high": 105.00, "low": 103.75, "close": 104.50, "adjusted_close": 104.50, "volume": 46000000},
        {"date": "2024-01-29", "open": 104.50, "high": 105.25, "low": 104.00, "close": 105.00, "adjusted_close": 105.00, "volume": 49000000},
        {"date": "2024-01-30", "open": 105.00, "high": 105.75, "low": 104.50, "close": 105.50, "adjusted_close": 105.50, "volume": 51000000},
    ]
}

# Quarterly dividends with all fields populated
STATIC_DIVIDENDS = {
    "AAPL": [
        {"ex_date": "2024-02-09", "payment_date": "2024-02-15", "amount_per_share": 0.24},
        {"ex_date": "2024-05-10", "payment_date": "2024-05-16", "amount_per_share": 0.25},
        {"ex_date": "2024-08-12", "payment_date": "2024-08-15", "amount_per_share": 0.25},
        {"ex_date": "2024-11-08", "payment_date": "2024-11-14", "amount_per_share": 0.25},
    ]
}


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "test-data-fetcher"}


@app.get("/test-data/prices")
async def get_test_prices(
    ticker: str = Query(default="AAPL", description="Stock ticker symbol"),
    days: int = Query(default=30, ge=1, le=365, description="Number of days of data")
):
    """
    Returns static sample price data for testing purposes.
    Uses deterministic test fixtures instead of live API data.
    """
    ticker_upper = ticker.upper()

    if ticker_upper not in STATIC_PRICES:
        raise HTTPException(
            status_code=404,
            detail=f"No test data available for ticker '{ticker}'. Available: {list(STATIC_PRICES.keys())}"
        )

    prices = STATIC_PRICES[ticker_upper]

    # Limit to requested days
    limited_prices = prices[:days] if days < len(prices) else prices

    return {
        "success": True,
        "data": {
            "ticker": ticker_upper,
            "frequency": "daily",
            "prices": limited_prices
        }
    }


@app.get("/test-data/dividends")
async def get_test_dividends(
    ticker: str = Query(default="AAPL", description="Stock ticker symbol"),
    years: int = Query(default=2, ge=1, le=10, description="Number of years of dividend history")
):
    """
    Returns static dividend history for testing purposes.
    Uses deterministic test fixtures instead of live API data.
    """
    ticker_upper = ticker.upper()

    if ticker_upper not in STATIC_DIVIDENDS:
        raise HTTPException(
            status_code=404,
            detail=f"No dividend test data available for ticker '{ticker}'. Available: {list(STATIC_DIVIDENDS.keys())}"
        )

    dividends = STATIC_DIVIDENDS[ticker_upper]

    return {
        "success": True,
        "data": {
            "ticker": ticker_upper,
            "dividends": dividends
        }
    }


@app.get("/test-data/sample-backtest-request")
async def get_sample_backtest_request():
    """
    Returns a sample backtest request payload for testing the Orchestrator.
    """
    return {
        "success": True,
        "data": {
            "market_params": {
                "ticker": "AAPL",
                "market_type": "Stock",
                "start_date": "2024-01-01",
                "end_date": "2024-06-01",
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
                "initial_capital": 10000,
                "investment_per_trade": 100,
                "reinvest_dividends": True,
                "transaction_cost_pct": 0,
                "cash_interest_rate_pct": 0
            },
            "baseline_params": {
                "initial_capital": 10000,
                "reinvest_dividends": True
            }
        }
    }
