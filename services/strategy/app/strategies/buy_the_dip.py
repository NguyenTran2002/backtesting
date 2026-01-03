from app.strategies.base import BaseStrategy
from app.schemas.models import PricePoint, SignalItem

class BuyTheDip(BaseStrategy):
    def generate_signals(self, price_data: list[PricePoint], config: dict) -> list[SignalItem]:
        # Get parameters from config with defaults
        threshold = config.get("price_change_threshold", -0.05)
        lookback = config.get("lookback_period", "daily")
        
        # Mapping lookback periods to trading day offsets
        lookback_map = {
            "daily": 1,
            "weekly": 5,
            "monthly": 21
        }
        offset = lookback_map.get(lookback, 1)
        
        signals = []
        # Iterate through price data starting from the offset
        for i in range(offset, len(price_data)):
            today = price_data[i]
            past = price_data[i - offset]
            
            # Logic: (today_close - yesterday_close) / yesterday_close
            price_change = (today.adjusted_close - past.adjusted_close) / past.adjusted_close
            
            # Generate buy signal if price change meets or exceeds threshold
            if price_change <= threshold:
                signals.append(SignalItem(
                    date=today.date,
                    action="BUY",
                    price=today.adjusted_close,
                    trigger_details={
                        "price_change_pct": round(price_change * 100, 2),
                        "threshold_pct": round(threshold * 100, 2),
                        "previous_close": past.adjusted_close
                    }
                ))
        return signals