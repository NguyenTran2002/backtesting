from pydantic import BaseModel, Field
from typing import Optional


class MarketParams(BaseModel):
    ticker: str = Field(..., description="Stock/ETF ticker symbol")
    market_type: str = Field(..., description="Type of security (Stock, ETF)")
    start_date: str = Field(..., description="Backtest start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="Backtest end date (YYYY-MM-DD)")
    frequency: str = Field(default="daily", description="Data frequency")


class StrategyConfig(BaseModel):
    price_change_threshold: Optional[float] = Field(
        default=None, description="Price drop threshold for buy_the_dip strategy"
    )
    lookback_period: Optional[str] = Field(
        default="daily", description="Lookback period for price comparison"
    )


class StrategyParams(BaseModel):
    strategy_type: str = Field(..., description="Strategy type (buy_the_dip, buy_and_hold)")
    config: StrategyConfig = Field(default_factory=StrategyConfig)


class PortfolioParams(BaseModel):
    initial_capital: float = Field(..., gt=0, description="Starting capital")
    investment_per_trade: float = Field(..., gt=0, description="Amount to invest per trade")
    reinvest_dividends: bool = Field(default=True, description="Whether to reinvest dividends")
    transaction_cost_pct: float = Field(default=0.0, ge=0, description="Transaction cost percentage")
    cash_interest_rate_pct: float = Field(default=0.0, ge=0, description="Annual interest rate on cash")


class BaselineParams(BaseModel):
    initial_capital: float = Field(..., gt=0, description="Baseline starting capital")
    reinvest_dividends: bool = Field(default=True, description="Whether to reinvest dividends")


class BacktestRequest(BaseModel):
    market_params: MarketParams
    strategy_params: StrategyParams
    portfolio_params: PortfolioParams
    baseline_params: BaselineParams
    use_test_data: bool = Field(
        default=False,
        description="Use test data fetcher instead of live market data"
    )
