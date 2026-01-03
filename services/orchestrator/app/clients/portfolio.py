import os
from typing import Any, Dict, List, Optional

from .base import BaseClient


class PortfolioClient(BaseClient):
    """Client for the Portfolio service."""

    def __init__(self):
        base_url = os.environ.get("PORTFOLIO_URL", "http://portfolio:8014")
        super().__init__(base_url)

    async def simulate(
        self,
        initial_capital: float,
        investment_per_trade: float,
        reinvest_dividends: bool,
        transaction_cost_pct: float,
        cash_interest_rate_pct: float,
        signals: List[Dict[str, Any]],
        price_data: List[Dict[str, Any]],
        dividend_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Run a portfolio simulation."""
        response = await self.post("/simulate", {
            "initial_capital": initial_capital,
            "investment_per_trade": investment_per_trade,
            "reinvest_dividends": reinvest_dividends,
            "transaction_cost_pct": transaction_cost_pct,
            "cash_interest_rate_pct": cash_interest_rate_pct,
            "signals": signals,
            "price_data": price_data,
            "dividend_data": dividend_data or []
        })
        return response.get("data", {})
