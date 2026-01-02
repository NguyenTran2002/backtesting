from typing import List, Optional, Dict
from datetime import datetime
import math


def _parse_date(s: str) -> datetime:
    return datetime.fromisoformat(s)


def _days_between(start: str, end: str) -> int:
    return ( _parse_date(end).date() - _parse_date(start).date() ).days


def calculate_returns(dates: List[str], values: List[float],
                      start_date: Optional[str] = None,
                      end_date: Optional[str] = None) -> Dict[str, float]:
    """
    Returns total_return_pct and annualized_return_pct (both as percentages).
    - dates: list of ISO date strings (aligned with values).
    - values: portfolio values (same length as dates).
    - start_date/end_date: optional ISO strings to override first/last date used for annualization.
    """
    if not dates or not values or len(dates) != len(values):
        return {"total_return_pct": 0.0, "annualized_return_pct": 0.0}

    initial_value = float(values[0])
    final_value = float(values[-1])

    if initial_value == 0:
        return {"total_return_pct": 0.0, "annualized_return_pct": 0.0}

    total_return = (final_value - initial_value) / initial_value
    total_return_pct = round(total_return * 100.0, 2)

    # determine period for annualization
    period_start = start_date if start_date else dates[0]
    period_end = end_date if end_date else dates[-1]

    try:
        days = _days_between(period_start, period_end)
    except Exception:
        days = (len(dates) - 1) or 1

    if days <= 0 or len(values) < 2:
        annualized_pct = 0.0
    else:
        try:
            annualized = (final_value / initial_value) ** (365.0 / float(days)) - 1.0
            annualized_pct = round(annualized * 100.0, 2)
        except Exception:
            annualized_pct = 0.0

    return {"total_return_pct": total_return_pct, "annualized_return_pct": annualized_pct}