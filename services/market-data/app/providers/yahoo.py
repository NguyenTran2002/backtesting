import yfinance as yf
import pandas as pd
from typing import List
from app.schemas.models import PriceItem, DividendItem, SearchResult
from app.providers.base import BaseDataProvider

class YahooFinanceProvider(BaseDataProvider):
    """
    Handles data extraction from Yahoo Finance via the yfinance library.
    """

    def get_prices(self, ticker_symbol: str, start: str, end: str, frequency: str) -> List[PriceItem]:
        """
        Fetch historical OHLCV data. 
        Note: yfinance 'history' returns adjusted prices by default.
        """
        # Map our internal frequency string to yfinance interval codes
        interval_map = {
            "daily": "1d",
            "weekly": "1wk",
            "monthly": "1mo"
        }
        yf_interval = interval_map.get(frequency, "1d")

        ticker = yf.Ticker(ticker_symbol)
        # Fetching history from Yahoo Finance
        df = ticker.history(start=start, end=end, interval=yf_interval)

        if df.empty:
            return []

        price_list = []
        for index, row in df.iterrows():
            # Convert timestamp index to ISO string (YYYY-MM-DD)
            date_str = index.strftime('%Y-%m-%d')
            
            # Convert numpy types to native Python types for JSON serialization
            price_list.append(PriceItem(
                date=date_str,
                open=float(row['Open']),
                high=float(row['High']),
                low=float(row['Low']),
                close=float(row['Close']),
                adjusted_close=float(row['Close']), # Adjusted close is critical for backtesting
                volume=int(row['Volume'])
            ))
        return price_list

    def get_dividends(self, ticker_symbol: str, start: str, end: str) -> List[DividendItem]:
        """
        Fetch historical dividend data.
        """
        ticker = yf.Ticker(ticker_symbol)
        # Fetch dividends series
        divs = ticker.dividends
        
        if divs.empty:
            return []

        # Filter by date range as yfinance returns the entire history
        mask = (divs.index >= start) & (divs.index <= end)
        filtered_divs = divs.loc[mask]

        dividend_list = []
        for date, amount in filtered_divs.items():
            dividend_list.append(DividendItem(
                ex_date=date.strftime('%Y-%m-%d'),
                payment_date=None,  # Use null if payment_date is unavailable
                amount_per_share=float(amount)
            ))
        return dividend_list
    
    def search_ticker(self, query: str) -> List[SearchResult]:
        """
        Search for ticker details using yfinance info.
        Note: This implementation treats the query as a specific ticker symbol.
        """
        try:
            ticker = yf.Ticker(query)
            info = ticker.info
            
            # If yfinance returns info, we wrap it in our SearchResult model
            if info and 'symbol' in info:
                return [SearchResult(
                    ticker=info.get('symbol', query),
                    name=info.get('longName', 'Unknown'),
                    market_type=info.get('quoteType', 'Unknown'),
                    exchange=info.get('exchange', 'Unknown')
                )]
            return []
        except Exception:
            # If ticker info fetch fails, return empty list
            return []