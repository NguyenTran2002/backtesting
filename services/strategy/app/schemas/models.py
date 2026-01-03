from pydantic import BaseModel
from typing import Optional, Any

# --- Request Models ---
class PricePoint(BaseModel):
    date: str
    adjusted_close: float

class StrategyConfig(BaseModel):
    price_change_threshold: Optional[float] = None  # For buy_the_dip
    lookback_period: Optional[str] = "daily"        # For buy_the_dip
    frequency: Optional[str] = None                 # For future use (DCA)

class SignalRequest(BaseModel):
    strategy_type: str
    config: StrategyConfig
    price_data: list[PricePoint]

# --- Response Models ---
class SignalItem(BaseModel):
    date: str
    action: str  # e.g., "BUY"
    price: float
    trigger_details: dict[str, Any]

class SignalData(BaseModel):
    strategy_type: str
    signals: list[SignalItem]
    total_signals: int

class SignalResponse(BaseModel):
    success: bool
    data: Optional[SignalData] = None
    error: Optional[dict[str, Any]] = None