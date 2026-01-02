from typing import Dict, List, Optional, Union
from pydantic import BaseModel


# --- Input models ----------------------------------------------------------
class PriceSeries(BaseModel):
    dates: List[str]
    portfolio_value: List[float]


class FinalState(BaseModel):
    portfolio_value: float
    total_invested: float


class PortfolioInput(BaseModel):
    time_series: PriceSeries
    final_state: FinalState


class CalculateRequest(BaseModel):
    """
    Request body for POST /calculate
    - portfolios: dict keyed by portfolio name (e.g., "active", "baseline")
    - start_date / end_date are optional ISO date strings used for annualization
    """
    risk_free_rate_annual: float = 0.0
    portfolios: Dict[str, PortfolioInput]
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# --- Metrics output models -------------------------------------------------
class MetricsOutput(BaseModel):
    total_return_pct: float
    annualized_return_pct: float
    max_drawdown_pct: float
    max_drawdown_duration_days: int
    volatility_annualized_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float


class ComparisonMetrics(BaseModel):
    excess_return_pct: float
    excess_annualized_return_pct: float
    excess_sharpe: float
    reduced_max_drawdown_pct: float
    reduced_volatility_pct: float


class CalculateResponse(BaseModel):
    """
    Top-level response model.
    `data` is a dict mapping portfolio names to MetricsOutput and includes a
    special 'comparison' key whose value is ComparisonMetrics.
    """
    success: bool
    data: Dict[str, Union[MetricsOutput, ComparisonMetrics]]