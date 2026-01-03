from typing import Dict


def calculate_comparison_metrics(active: Dict, baseline: Dict) -> Dict:
    """
    Expects active and baseline to contain keys:
      - total_return_pct
      - annualized_return_pct
      - sharpe_ratio
      - max_drawdown_pct (negative percentage)
      - volatility_annualized_pct
    Returns dictionary matching INSTRUCTIONS.md comparison fields.
    """
    # safe access with defaults
    a_total = float(active.get("total_return_pct", 0.0))
    b_total = float(baseline.get("total_return_pct", 0.0))

    a_ann = float(active.get("annualized_return_pct", 0.0))
    b_ann = float(baseline.get("annualized_return_pct", 0.0))

    a_sharpe = float(active.get("sharpe_ratio", 0.0))
    b_sharpe = float(baseline.get("sharpe_ratio", 0.0))

    # max_drawdown_pct are negative numbers (e.g., -35.2). To compute reduction, subtract negatives.
    a_mdd = float(active.get("max_drawdown_pct", 0.0))
    b_mdd = float(baseline.get("max_drawdown_pct", 0.0))

    a_vol = float(active.get("volatility_annualized_pct", 0.0))
    b_vol = float(baseline.get("volatility_annualized_pct", 0.0))

    comparison = {
        "excess_return_pct": round(a_total - b_total, 2),
        "excess_annualized_return_pct": round(a_ann - b_ann, 2),
        "excess_sharpe": round(a_sharpe - b_sharpe, 4),
        # reduced_max_drawdown_pct: how many percentage points better (baseline negative minus active negative)
        "reduced_max_drawdown_pct": round(b_mdd - a_mdd, 2),
        "reduced_volatility_pct": round(b_vol - a_vol, 2),
    }
    return comparison