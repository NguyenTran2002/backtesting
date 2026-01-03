from app.strategies.base import BaseStrategy
from app.schemas.models import PricePoint, SignalItem

class BuyAndHold(BaseStrategy):
    def generate_signals(self, price_data: list[PricePoint], config: dict) -> list[SignalItem]:
        # Implementation of buy_and_hold logic
        if not price_data:
            return []
        
        # Generate one signal on the first day of price_data
        first_day = price_data[0]
        return [SignalItem(
            date=first_day.date,
            action="BUY",
            price=first_day.adjusted_close,
            trigger_details={
                "reason": "Initial buy for buy-and-hold strategy"
            }
        )]