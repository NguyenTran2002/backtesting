import asyncio
import time
from typing import Dict, Any, List

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..schemas.requests import BacktestRequest
from ..schemas.responses import (
    BacktestResponse, BacktestData, BacktestMetadata,
    ActiveStrategy, Baseline, Portfolio, PortfolioTimeSeries, PortfolioFinalState,
    Metrics, Signal, Trade, MarketData, PriceData, DividendData, Comparison
)
from ..clients.base import ServiceError, ServiceUnavailableError, ServiceRequestError
from ..clients.market_data import MarketDataClient, extract_price_data, extract_dividend_data
from ..clients.strategy import StrategyClient, extract_signals
from ..clients.portfolio import PortfolioClient
from ..clients.metrics import MetricsClient


router = APIRouter()

# Global clients for services that don't have test mode
strategy_client = StrategyClient()
portfolio_client = PortfolioClient()
metrics_client = MetricsClient()


def build_error_response(code: str, message: str, details: Dict[str, Any] = None) -> JSONResponse:
    """Build a standardized error response."""
    status_map = {
        "INVALID_REQUEST": 400,
        "INVALID_TICKER": 400,
        "INVALID_DATE_RANGE": 400,
        "INSUFFICIENT_DATA": 400,
        "STRATEGY_NOT_FOUND": 400,
        "SERVICE_UNAVAILABLE": 503,
        "SERVICE_TIMEOUT": 503,
        "EXTERNAL_API_ERROR": 502,
        "INTERNAL_ERROR": 500,
    }
    status_code = status_map.get(code, 500)

    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {}
            }
        }
    )


def build_signals_list(signals_data: List[Dict[str, Any]]) -> List[Signal]:
    """Convert raw signals to Signal objects."""
    return [
        Signal(
            date=s.get("date", ""),
            action=s.get("action", ""),
            price=s.get("price", 0),
            trigger_details=s.get("trigger_details")
        )
        for s in signals_data
    ]


def build_trades_list(trades_data: List[Dict[str, Any]], ticker: str, trigger_map: Dict[str, str]) -> List[Trade]:
    """Convert raw trades to Trade objects with trigger info."""
    return [
        Trade(
            date=t.get("date", ""),
            action=t.get("action", ""),
            ticker=ticker,
            shares=t.get("shares", 0),
            price=t.get("price", 0),
            amount=t.get("amount", 0),
            trigger=trigger_map.get(t.get("date")),
            transaction_cost=t.get("transaction_cost")
        )
        for t in trades_data
    ]


def build_portfolio(portfolio_data: Dict[str, Any], trades: List[Trade] = None) -> Portfolio:
    """Build Portfolio object from raw data."""
    ts = portfolio_data.get("time_series", {})
    fs = portfolio_data.get("final_state", {})

    return Portfolio(
        time_series=PortfolioTimeSeries(
            dates=ts.get("dates", []),
            portfolio_value=ts.get("portfolio_value", []),
            holdings_value=ts.get("holdings_value"),
            cash_balance=ts.get("cash_balance"),
            cumulative_invested=ts.get("cumulative_invested"),
            cumulative_dividends=ts.get("cumulative_dividends"),
            shares_held=ts.get("shares_held")
        ),
        trades=trades,
        final_state=PortfolioFinalState(
            total_shares=fs.get("total_shares"),
            cash_balance=fs.get("cash_balance"),
            holdings_value=fs.get("holdings_value"),
            portfolio_value=fs.get("portfolio_value", 0),
            total_invested=fs.get("total_invested", 0),
            total_dividends_received=fs.get("total_dividends_received"),
            total_transaction_costs=fs.get("total_transaction_costs")
        )
    )


def build_metrics(metrics_data: Dict[str, Any], total_trades: int = None) -> Metrics:
    """Build Metrics object from raw data."""
    return Metrics(
        total_return_pct=metrics_data.get("total_return_pct", 0),
        annualized_return_pct=metrics_data.get("annualized_return_pct", 0),
        max_drawdown_pct=metrics_data.get("max_drawdown_pct", 0),
        max_drawdown_duration_days=metrics_data.get("max_drawdown_duration_days"),
        volatility_annualized_pct=metrics_data.get("volatility_annualized_pct", 0),
        sharpe_ratio=metrics_data.get("sharpe_ratio", 0),
        sortino_ratio=metrics_data.get("sortino_ratio"),
        calmar_ratio=metrics_data.get("calmar_ratio"),
        total_trades=total_trades
    )


def build_market_data(ticker: str, prices_data: Dict[str, Any], dividends_data: Dict[str, Any]) -> MarketData:
    """Build MarketData object from raw data."""
    prices = prices_data.get("prices", [])
    dividends = dividends_data.get("dividends", [])

    return MarketData(
        ticker=ticker,
        prices=[
            PriceData(
                date=p.get("date", ""),
                open=p.get("open"),
                high=p.get("high"),
                low=p.get("low"),
                close=p.get("close"),
                adjusted_close=p.get("adjusted_close", 0),
                volume=p.get("volume")
            )
            for p in prices
        ],
        dividends=[
            DividendData(
                ex_date=d.get("ex_date", ""),
                payment_date=d.get("payment_date"),
                amount_per_share=d.get("amount_per_share", 0)
            )
            for d in dividends
        ]
    )


def build_trigger_map(signals: List[Dict[str, Any]]) -> Dict[str, str]:
    """Build a map of date -> trigger string for merging with trades."""
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


@router.post("/backtest")
async def run_backtest(request: BacktestRequest):
    """Execute a complete backtest workflow."""
    start_time = time.time()

    # Create market data client based on test mode flag
    market_data_client = MarketDataClient(use_test_data=request.use_test_data)

    try:
        # Step 1: Fetch market data (parallel)
        prices_data, dividends_data = await asyncio.gather(
            market_data_client.fetch_prices(
                ticker=request.market_params.ticker,
                market_type=request.market_params.market_type,
                start_date=request.market_params.start_date,
                end_date=request.market_params.end_date,
                frequency=request.market_params.frequency
            ),
            market_data_client.fetch_dividends(
                ticker=request.market_params.ticker,
                start_date=request.market_params.start_date,
                end_date=request.market_params.end_date
            )
        )

        price_data_for_strategy = extract_price_data(prices_data)
        dividend_data_for_portfolio = extract_dividend_data(dividends_data)

        if not price_data_for_strategy:
            return build_error_response(
                "INSUFFICIENT_DATA",
                "No price data available for the specified date range",
                {"ticker": request.market_params.ticker}
            )

        # Step 2: Generate signals (parallel for active and baseline)
        active_config = {
            "price_change_threshold": request.strategy_params.config.price_change_threshold,
            "lookback_period": request.strategy_params.config.lookback_period
        }

        active_signals_data, baseline_signals_data = await asyncio.gather(
            strategy_client.generate_signals(
                strategy_type=request.strategy_params.strategy_type,
                config=active_config,
                price_data=price_data_for_strategy
            ),
            strategy_client.generate_signals(
                strategy_type="buy_and_hold",
                config={},
                price_data=price_data_for_strategy
            )
        )

        active_signals = extract_signals(active_signals_data)
        baseline_signals = extract_signals(baseline_signals_data)
        active_trigger_map = build_trigger_map(active_signals)

        # Step 3: Simulate portfolios (parallel)
        active_portfolio_data, baseline_portfolio_data = await asyncio.gather(
            portfolio_client.simulate(
                initial_capital=request.portfolio_params.initial_capital,
                investment_per_trade=request.portfolio_params.investment_per_trade,
                reinvest_dividends=request.portfolio_params.reinvest_dividends,
                transaction_cost_pct=request.portfolio_params.transaction_cost_pct,
                cash_interest_rate_pct=request.portfolio_params.cash_interest_rate_pct,
                signals=active_signals,
                price_data=price_data_for_strategy,
                dividend_data=dividend_data_for_portfolio
            ),
            portfolio_client.simulate(
                initial_capital=request.baseline_params.initial_capital,
                investment_per_trade=request.baseline_params.initial_capital,
                reinvest_dividends=request.baseline_params.reinvest_dividends,
                transaction_cost_pct=0.0,
                cash_interest_rate_pct=0.0,
                signals=baseline_signals,
                price_data=price_data_for_strategy,
                dividend_data=dividend_data_for_portfolio
            )
        )

        # Step 4: Calculate metrics
        metrics_data = await metrics_client.calculate(
            active_portfolio=active_portfolio_data,
            baseline_portfolio=baseline_portfolio_data,
            start_date=request.market_params.start_date,
            end_date=request.market_params.end_date
        )

        # Step 5: Assemble response
        execution_time_ms = int((time.time() - start_time) * 1000)

        active_metrics = metrics_data.get("active", {})
        baseline_metrics = metrics_data.get("baseline", {})
        comparison_metrics = metrics_data.get("comparison", {})

        active_trades_raw = active_portfolio_data.get("trades", [])
        active_trades = build_trades_list(active_trades_raw, request.market_params.ticker, active_trigger_map)

        response_data = BacktestData(
            metadata=BacktestMetadata(
                ticker=request.market_params.ticker,
                start_date=request.market_params.start_date,
                end_date=request.market_params.end_date,
                strategy_type=request.strategy_params.strategy_type,
                execution_time_ms=execution_time_ms
            ),
            active_strategy=ActiveStrategy(
                signals=build_signals_list(active_signals),
                portfolio=build_portfolio(active_portfolio_data, active_trades),
                metrics=build_metrics(active_metrics, len(active_trades_raw))
            ),
            baseline=Baseline(
                portfolio=build_portfolio(baseline_portfolio_data),
                metrics=build_metrics(baseline_metrics)
            ),
            market_data=build_market_data(
                request.market_params.ticker,
                prices_data,
                dividends_data
            ),
            comparison=Comparison(
                excess_return_pct=comparison_metrics.get("excess_return_pct", 0),
                excess_annualized_return_pct=comparison_metrics.get("excess_annualized_return_pct"),
                excess_sharpe=comparison_metrics.get("excess_sharpe", 0),
                reduced_max_drawdown_pct=comparison_metrics.get("reduced_max_drawdown_pct", 0),
                reduced_volatility_pct=comparison_metrics.get("reduced_volatility_pct")
            )
        )

        return BacktestResponse(success=True, data=response_data)

    except ServiceUnavailableError as e:
        return build_error_response(e.code, e.message, e.details)
    except ServiceRequestError as e:
        return build_error_response(e.code, e.message, e.details)
    except Exception as e:
        return build_error_response(
            "INTERNAL_ERROR",
            f"An unexpected error occurred: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Enhanced health check that verifies all downstream services."""
    services_status = {}

    health_checks = await asyncio.gather(
        market_data_client.health_check(),
        strategy_client.health_check(),
        portfolio_client.health_check(),
        metrics_client.health_check(),
        return_exceptions=True
    )

    service_names = ["market_data", "strategy", "portfolio", "metrics"]
    for name, result in zip(service_names, health_checks):
        if isinstance(result, Exception):
            services_status[name] = "unhealthy"
        else:
            services_status[name] = "healthy" if result else "unhealthy"

    all_healthy = all(status == "healthy" for status in services_status.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": services_status
    }
