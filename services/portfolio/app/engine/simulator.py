from typing import Dict, List
from ..schemas.models import SimulateRequest

def run_simulation(req: SimulateRequest) -> Dict:
    """
    Run the portfolio simulation.

    - Expects req.price_data to be ordered by date (ascending).
    - transaction_cost_pct and cash_interest_rate_pct are treated as fractions (0.01 == 1%).
    - Raises ValueError on invalid input (caller/router should convert to HTTP error).
    - Returns a dict shaped like SimulateData (time_series, trades, final_state).
    """
    if not req.price_data:
        raise ValueError("INSUFFICIENT_DATA: price_data must not be empty")

    # Build quick lookups
    price_by_date = {p.date: float(p.adjusted_close) for p in req.price_data}
    # signals: map date -> list of signals (handle multiple signals same date)
    signal_by_date: Dict[str, List] = {}
    for s in req.signals or []:
        signal_by_date.setdefault(s.date, []).append(s)
    dividend_by_date = {d.ex_date: float(d.amount_per_share) for d in (req.dividend_data or [])}

    # State
    cash = float(req.initial_capital)
    shares = 0.0
    total_invested = 0.0
    total_dividends = 0.0
    total_transaction_costs = 0.0

    # Time series containers
    ts_dates: List[str] = []
    ts_portfolio: List[float] = []
    ts_holdings: List[float] = []
    ts_cash: List[float] = []
    ts_shares: List[float] = []
    ts_cum_invested: List[float] = []
    ts_cum_div: List[float] = []

    trades: List[Dict] = []

    # Precompute daily cash interest factor if provided (we compute per day inside loop to allow zero)
    for day in req.price_data:
        date = day.date
        price = float(day.adjusted_close)

        # 1) Dividends (payable on ex_date)
        if date in dividend_by_date and shares > 0:
            amount_per_share = dividend_by_date[date]
            dividend_payment = shares * amount_per_share
            total_dividends += dividend_payment

            if req.reinvest_dividends:
                # reinvest at today's price (avoid division by zero)
                if price > 0:
                    new_shares = dividend_payment / price
                    shares += new_shares
                else:
                    # if price invalid, treat as cash
                    cash += dividend_payment
            else:
                cash += dividend_payment

        # 2) Buy signals on this date
        signals_today = signal_by_date.get(date, [])
        for sig in signals_today:
            if (sig.action or "").upper() == "BUY":
                invest_amt = float(req.investment_per_trade)
                # no partial fills: require full investment amount available
                if cash >= invest_amt and invest_amt > 0 and price > 0:
                    tx_cost = invest_amt * float(req.transaction_cost_pct)
                    net_invest = invest_amt - tx_cost
                    if net_invest <= 0:
                        # nothing to buy (transaction cost consumes all), skip
                        continue

                    shares_bought = net_invest / price
                    shares += shares_bought
                    cash -= invest_amt
                    total_invested += invest_amt
                    total_transaction_costs += tx_cost

                    trades.append({
                        "date": date,
                        "action": "BUY",
                        "ticker": None,
                        "shares": round(shares_bought, 6),
                        "price": round(price, 2),
                        "amount": round(invest_amt, 2),
                        "transaction_cost": round(tx_cost, 2),
                    })
                # else skip due to insufficient cash

        # 3) Cash interest (daily compound) if provided as annual fraction
        if req.cash_interest_rate_pct and float(req.cash_interest_rate_pct) > 0:
            annual_rate = float(req.cash_interest_rate_pct)
            # assume 252 trading days
            daily_rate = (1.0 + annual_rate) ** (1.0 / 252.0) - 1.0
            cash *= (1.0 + daily_rate)

        # 4) Compute holdings and portfolio value
        holdings_value = shares * price
        portfolio_value = cash + holdings_value

        # Record time series (round for output, keep internal state unrounded)
        ts_dates.append(date)
        ts_portfolio.append(round(portfolio_value, 2))
        ts_holdings.append(round(holdings_value, 2))
        ts_cash.append(round(cash, 2))
        ts_shares.append(round(shares, 6))
        ts_cum_invested.append(round(total_invested, 2))
        ts_cum_div.append(round(total_dividends, 2))

    # Final state using last available price
    last_price = float(req.price_data[-1].adjusted_close)
    final_holdings = shares * last_price
    final_portfolio = cash + final_holdings

    final_state = {
        "total_shares": round(shares, 6),
        "cash_balance": round(cash, 2),
        "holdings_value": round(final_holdings, 2),
        "portfolio_value": round(final_portfolio, 2),
        "total_invested": round(total_invested, 2),
        "total_dividends_received": round(total_dividends, 2),
        "total_transaction_costs": round(total_transaction_costs, 2),
    }

    return {
        "time_series": {
            "dates": ts_dates,
            "portfolio_value": ts_portfolio,
            "holdings_value": ts_holdings,
            "cash_balance": ts_cash,
            "shares_held": ts_shares,
            "cumulative_invested": ts_cum_invested,
            "cumulative_dividends": ts_cum_div,
        },
        "trades": trades,
        "final_state": final_state,
    }