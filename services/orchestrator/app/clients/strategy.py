import os
from typing import Any, Dict, List, Optional

from .base import BaseClient


class StrategyClient(BaseClient):
    """Client for the Strategy service."""

    def __init__(self):
        base_url = os.environ.get("STRATEGY_URL", "http://strategy:8013")
        super().__init__(base_url)

    async def generate_signals(
        self,
        strategy_type: str,
        config: Dict[str, Any],
        price_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate buy/sell signals for a strategy."""
        response = await self.post("/signals", {
            "strategy_type": strategy_type,
            "config": config,
            "price_data": price_data
        })
        return response.get("data", {})


def extract_signals(signals_response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract signals list from response."""
    return signals_response.get("signals", [])


def build_trigger_map(signals: List[Dict[str, Any]]) -> Dict[str, str]:
    """Build a map of date -> trigger_details for merging with trades."""
    trigger_map = {}
    for signal in signals:
        date = signal.get("date")
        trigger = signal.get("trigger_details", {})
        if date and trigger:
            if isinstance(trigger, dict):
                trigger_str = trigger.get("reason", str(trigger))
            else:
                trigger_str = str(trigger)
            trigger_map[date] = trigger_str
    return trigger_map
