from typing import List, Optional
from pydantic import BaseModel

class PricePoint(BaseModel):
    date: str
    adjusted_close: float

class DividendData(BaseModel):
    ex_date: str
    amount_per_share: float

class Signal(BaseModel):
    date: str
    action: str  # "BUY" (for now)
    price: Optional[float] = None

class SimulateRequest(BaseModel):
    initial_capital: float
    investment_per_trade: float
    reinvest_dividends: bool = True
    transaction_cost_pct: float = 0.0
    cash_interest_rate_pct: float = 0.0
    signals: List[Signal]
    price_data: List[PricePoint]
    dividend_data: Optional[List[DividendData]] = []

# Response pieces
class TimeSeries(BaseModel):
    dates: List[str]
    portfolio_value: List[float]
    holdings_value: List[float]
    cash_balance: List[float]
    shares_held: List[float]
    cumulative_invested: List[float]
    cumulative_dividends: List[float]

class TradeRecord(BaseModel):
    date: str
    action: str
    ticker: Optional[str] = None
    shares: float
    price: float
    amount: float
    transaction_cost: float

class FinalState(BaseModel):
    total_shares: float
    cash_balance: float
    holdings_value: float
    portfolio_value: float
    total_invested: float
    total_dividends_received: float
    total_transaction_costs: float

class SimulateData(BaseModel):
    time_series: TimeSeries
    trades: List[TradeRecord]
    final_state: FinalState

class SimulateResponse(BaseModel):
    success: bool
    data: SimulateData