from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from ..schemas.models import CalculateRequest, CalculateResponse
from ..calculators.returns import calculate_returns
from ..calculators.risk import calculate_risk_metrics
from ..calculators.comparison import calculate_comparison_metrics

router = APIRouter()


@router.post("/calculate", response_model=CalculateResponse)
async def calculate_endpoint(payload: CalculateRequest):
    """
    Calculate metrics for each portfolio in payload.portfolios and
    produce an optional comparison when two portfolios are provided
    (prefers a portfolio named 'active' vs 'baseline' if present).
    """
    if not payload.portfolios:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error": {"code": "INVALID_REQUEST", "message": "portfolios must be provided", "details": {}}
        })

    results: Dict[str, Any] = {}

    # compute metrics per portfolio
    for name, p in payload.portfolios.items():
        dates = p.time_series.dates
        values = p.time_series.portfolio_value

        # returns (total + annualized)
        ret = calculate_returns(dates, values,
                                start_date=payload.start_date,
                                end_date=payload.end_date)

        # risk metrics (volatility, drawdown, sharpe, sortino, calmar)
        risk = calculate_risk_metrics(dates, values,
                                      risk_free_rate_annual=payload.risk_free_rate_annual,
                                      start_date=payload.start_date,
                                      end_date=payload.end_date)

        # merge into one metrics object (matches MetricsOutput fields)
        metrics = {
            "total_return_pct": float(ret.get("total_return_pct", 0.0)),
            "annualized_return_pct": float(ret.get("annualized_return_pct", 0.0)),
            "max_drawdown_pct": float(risk.get("max_drawdown_pct", 0.0)),
            "max_drawdown_duration_days": int(risk.get("max_drawdown_duration_days", 0)),
            "volatility_annualized_pct": float(risk.get("volatility_annualized_pct", 0.0)),
            "sharpe_ratio": float(risk.get("sharpe_ratio", 0.0)),
            "sortino_ratio": float(risk.get("sortino_ratio", 0.0)),
            "calmar_ratio": float(risk.get("calmar_ratio", 0.0)),
        }

        results[name] = metrics

    # produce comparison metrics if possible
    comparison = None
    # prefer explicit 'active' and 'baseline' keys when available
    if "active" in payload.portfolios and "baseline" in payload.portfolios:
        active_metrics = results["active"]
        baseline_metrics = results["baseline"]
        comparison = calculate_comparison_metrics(active_metrics, baseline_metrics)
    else:
        # if exactly two portfolios provided, compare the first two (deterministic order)
        keys = list(payload.portfolios.keys())
        if len(keys) >= 2:
            active_metrics = results[keys[0]]
            baseline_metrics = results[keys[1]]
            comparison = calculate_comparison_metrics(active_metrics, baseline_metrics)

    if comparison is not None:
        results["comparison"] = comparison

    return {"success": True, "data": results}