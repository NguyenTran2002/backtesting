import os
from typing import Any, Dict, List

from .base import BaseClient


TEST_DATA_URL = "http://test-data-fetcher:8016"
MARKET_DATA_URL = os.environ.get("MARKET_DATA_URL", "http://market-data:8012")


class MarketDataClient(BaseClient):
    """Client for the Market Data service."""

    def __init__(self, use_test_data: bool = False):
        base_url = TEST_DATA_URL if use_test_data else MARKET_DATA_URL
        super().__init__(base_url)

    async def fetch_prices(
        self,
        ticker: str,
        market_type: str,
        start_date: str,
        end_date: str,
        frequency: str = "daily"
    ) -> Dict[str, Any]:
        """Fetch historical price data for a ticker."""
        response = await self.post("/prices", {
            "ticker": ticker,
            "market_type": market_type,
            "start_date": start_date,
            "end_date": end_date,
            "frequency": frequency
        })
        return response.get("data", {})

    async def fetch_dividends(
        self,
        ticker: str,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """Fetch dividend history for a ticker."""
        response = await self.post("/dividends", {
            "ticker": ticker,
            "start_date": start_date,
            "end_date": end_date
        })
        return response.get("data", {})


def extract_price_data(prices_response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract date and adjusted_close from price response for strategy service."""
    prices = prices_response.get("prices", [])
    return [
        {"date": p["date"], "adjusted_close": p["adjusted_close"]}
        for p in prices
    ]


def extract_dividend_data(dividends_response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract dividend data for portfolio service."""
    dividends = dividends_response.get("dividends", [])
    return [
        {"ex_date": d["ex_date"], "amount_per_share": d["amount_per_share"]}
        for d in dividends
    ]
