from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict


class BacktestMetadata(BaseModel):
    ticker: str
    start_date: str
    end_date: str
    strategy_type: str
    execution_time_ms: Optional[int] = None


class Signal(BaseModel):
    date: str
    action: str
    price: float
    trigger_details: Optional[Dict[str, Any]] = None


class Trade(BaseModel):
    date: str
    action: str
    ticker: Optional[str] = None
    shares: float
    price: float
    amount: float
    trigger: Optional[str] = None
    transaction_cost: Optional[float] = None


class PortfolioTimeSeries(BaseModel):
    dates: List[str]
    portfolio_value: List[float]
    holdings_value: Optional[List[float]] = None
    cash_balance: Optional[List[float]] = None
    cumulative_invested: Optional[List[float]] = None
    cumulative_dividends: Optional[List[float]] = None
    shares_held: Optional[List[float]] = None


class PortfolioFinalState(BaseModel):
    total_shares: Optional[float] = None
    cash_balance: Optional[float] = None
    holdings_value: Optional[float] = None
    portfolio_value: float
    total_invested: float
    total_dividends_received: Optional[float] = None
    total_transaction_costs: Optional[float] = None


class Portfolio(BaseModel):
    time_series: PortfolioTimeSeries
    trades: Optional[List[Trade]] = None
    final_state: PortfolioFinalState


class Metrics(BaseModel):
    total_return_pct: float
    annualized_return_pct: float
    max_drawdown_pct: float
    max_drawdown_duration_days: Optional[int] = None
    volatility_annualized_pct: float
    sharpe_ratio: float
    sortino_ratio: Optional[float] = None
    calmar_ratio: Optional[float] = None
    total_trades: Optional[int] = None


class ActiveStrategy(BaseModel):
    signals: List[Signal]
    portfolio: Portfolio
    metrics: Metrics


class Baseline(BaseModel):
    portfolio: Portfolio
    metrics: Metrics


class PriceData(BaseModel):
    date: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    adjusted_close: float
    volume: Optional[int] = None


class DividendData(BaseModel):
    ex_date: str
    payment_date: Optional[str] = None
    amount_per_share: float


class MarketData(BaseModel):
    ticker: str
    prices: List[PriceData]
    dividends: List[DividendData]


class Comparison(BaseModel):
    excess_return_pct: float
    excess_annualized_return_pct: Optional[float] = None
    excess_sharpe: float
    reduced_max_drawdown_pct: float
    reduced_volatility_pct: Optional[float] = None


class BacktestData(BaseModel):
    metadata: BacktestMetadata
    active_strategy: ActiveStrategy
    baseline: Baseline
    market_data: MarketData
    comparison: Comparison


class BacktestResponse(BaseModel):
    success: bool = True
    data: BacktestData


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail
