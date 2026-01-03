import os
from typing import Any, Dict

from .base import BaseClient


class MetricsClient(BaseClient):
    """Client for the Metrics service."""

    def __init__(self):
        base_url = os.environ.get("METRICS_URL", "http://metrics:8015")
        super().__init__(base_url)

    async def calculate(
        self,
        active_portfolio: Dict[str, Any],
        baseline_portfolio: Dict[str, Any],
        start_date: str,
        end_date: str,
        risk_free_rate_annual: float = 0.0
    ) -> Dict[str, Any]:
        """Calculate performance metrics for portfolios."""
        response = await self.post("/calculate", {
            "risk_free_rate_annual": risk_free_rate_annual,
            "portfolios": {
                "active": {
                    "time_series": {
                        "dates": active_portfolio.get("time_series", {}).get("dates", []),
                        "portfolio_value": active_portfolio.get("time_series", {}).get("portfolio_value", [])
                    },
                    "final_state": {
                        "portfolio_value": active_portfolio.get("final_state", {}).get("portfolio_value", 0),
                        "total_invested": active_portfolio.get("final_state", {}).get("total_invested", 0)
                    }
                },
                "baseline": {
                    "time_series": {
                        "dates": baseline_portfolio.get("time_series", {}).get("dates", []),
                        "portfolio_value": baseline_portfolio.get("time_series", {}).get("portfolio_value", [])
                    },
                    "final_state": {
                        "portfolio_value": baseline_portfolio.get("final_state", {}).get("portfolio_value", 0),
                        "total_invested": baseline_portfolio.get("final_state", {}).get("total_invested", 0)
                    }
                }
            },
            "start_date": start_date,
            "end_date": end_date
        })
        return response.get("data", {})
