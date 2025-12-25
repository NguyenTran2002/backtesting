from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import yfinance as yf

app = FastAPI(
    title="Test Data Fetcher Service",
    description="Provides sample market data for testing other services",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    Fetch sample price data from Yahoo Finance for testing purposes.
    Returns OHLCV data in the format expected by the Market Data service.
    """
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days + 10)  # Extra buffer for trading days

        stock = yf.Ticker(ticker)
        df = stock.history(start=start_date.strftime("%Y-%m-%d"), end=end_date.strftime("%Y-%m-%d"))

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for ticker '{ticker}'")

        # Limit to requested days
        df = df.tail(days)

        prices = []
        for date, row in df.iterrows():
            prices.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "close": round(row["Close"], 2),
                "adjusted_close": round(row["Close"], 2),  # yfinance returns adjusted by default
                "volume": int(row["Volume"])
            })

        return {
            "success": True,
            "data": {
                "ticker": ticker.upper(),
                "frequency": "daily",
                "prices": prices
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")


@app.get("/test-data/dividends")
async def get_test_dividends(
    ticker: str = Query(default="AAPL", description="Stock ticker symbol"),
    years: int = Query(default=2, ge=1, le=10, description="Number of years of dividend history")
):
    """
    Fetch dividend history from Yahoo Finance for testing purposes.
    Returns dividend data in the format expected by the Market Data service.
    """
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years * 365)

        stock = yf.Ticker(ticker)
        dividends = stock.dividends

        # Filter to date range
        dividends = dividends[dividends.index >= start_date.strftime("%Y-%m-%d")]

        dividend_list = []
        for date, amount in dividends.items():
            dividend_list.append({
                "ex_date": date.strftime("%Y-%m-%d"),
                "payment_date": (date + timedelta(days=5)).strftime("%Y-%m-%d"),  # Approximate
                "amount_per_share": round(float(amount), 4)
            })

        return {
            "success": True,
            "data": {
                "ticker": ticker.upper(),
                "dividends": dividend_list
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dividends: {str(e)}")


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
