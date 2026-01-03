from typing import List, Dict, Optional
import numpy as np
from datetime import datetime
from .returns import calculate_returns


def _parse_date(s: str) -> datetime:
    return datetime.fromisoformat(s)


def _days_between(start: str, end: str) -> int:
    return (_parse_date(end).date() - _parse_date(start).date()).days


def _daily_returns(values: List[float]) -> List[float]:
    if not values or len(values) < 2:
        return []
    vals = np.array(values, dtype=float)
    ret = vals[1:] / vals[:-1] - 1.0
    return ret.tolist()


def calculate_risk_metrics(dates: List[str], values: List[float],
                           risk_free_rate_annual: float = 0.0,
                           start_date: Optional[str] = None,
                           end_date: Optional[str] = None) -> Dict[str, object]:
    """
    Returns:
      - volatility_annualized_pct (float)
      - max_drawdown_pct (float, negative)
      - max_drawdown_duration_days (int)
      - sharpe_ratio (float)
      - sortino_ratio (float)
      - calmar_ratio (float)
    """
    if not dates or not values or len(dates) != len(values):
        return {
            "volatility_annualized_pct": 0.0,
            "max_drawdown_pct": 0.0,
            "max_drawdown_duration_days": 0,
            "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0,
            "calmar_ratio": 0.0,
        }

    # Daily returns
    daily_returns = _daily_returns(values)
    if len(daily_returns) == 0:
        volatility = 0.0
    else:
        volatility = float(np.std(daily_returns, ddof=0) * np.sqrt(252.0))  # as fraction

    # Max drawdown and duration (in days)
    peak_value = values[0]
    peak_index = 0
    max_dd = 0.0
    max_dd_start = 0
    max_dd_end = 0

    for i, v in enumerate(values):
        if v > peak_value:
            peak_value = v
            peak_index = i
        drawdown = (peak_value - v) / peak_value if peak_value > 0 else 0.0
        if drawdown > max_dd:
            max_dd = drawdown
            max_dd_start = peak_index
            max_dd_end = i

    # compute recovery duration: find for the recorded peak when the series returns to peak or higher
    duration_days = 0
    if max_dd > 0:
        peak_idx = max_dd_start
        # search for recovery index after max_dd_end where value >= value at peak_idx
        recovery_idx = None
        for j in range(max_dd_end + 1, len(values)):
            if values[j] >= values[peak_idx]:
                recovery_idx = j
                break
        if recovery_idx is not None:
            try:
                duration_days = _days_between(dates[peak_idx], dates[recovery_idx])
            except Exception:
                duration_days = recovery_idx - peak_idx
        else:
            # not recovered by end -> duration until last date
            try:
                duration_days = _days_between(dates[peak_idx], dates[-1])
            except Exception:
                duration_days = len(values) - 1 - peak_idx
    else:
        duration_days = 0

    # Convert max drawdown to negative percentage
    max_drawdown_pct = round(-max_dd * 100.0, 2)

    # Annualized return needed for ratios (use returns calculator)
    ret = calculate_returns(dates, values, start_date=start_date, end_date=end_date)
    annualized_return_pct = ret.get("annualized_return_pct", 0.0)
    annualized_return = annualized_return_pct / 100.0

    # Sharpe
    excess_return = annualized_return - float(risk_free_rate_annual)
    sharpe = excess_return / volatility if volatility > 0 else 0.0

    # Sortino: downside volatility
    neg_rets = [r for r in daily_returns if r < 0]
    if neg_rets:
        downside_vol = float(np.std(neg_rets, ddof=0) * np.sqrt(252.0))
    else:
        downside_vol = 0.0
    sortino = excess_return / downside_vol if downside_vol > 0 else 0.0

    # Calmar: annualized_return / abs(max_drawdown)
    calmar = annualized_return / max_dd if max_dd > 0 else 0.0

    return {
        "volatility_annualized_pct": round(volatility * 100.0, 2),
        "max_drawdown_pct": max_drawdown_pct,
        "max_drawdown_duration_days": int(duration_days),
        "sharpe_ratio": round(float(sharpe), 4),
        "sortino_ratio": round(float(sortino), 4),
        "calmar_ratio": round(float(calmar), 4),
    }