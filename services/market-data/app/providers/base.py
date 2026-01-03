from abc import ABC, abstractmethod
from typing import List
from app.schemas.models import PriceItem, DividendItem, SearchResult

class BaseDataProvider(ABC):
    """
    Abstract Base Class that defines the interface for all market data providers.
    Any new provider implementation must inherit from this class.
    """

    @abstractmethod
    def get_prices(self, ticker: str, start: str, end: str, frequency: str) -> List[PriceItem]:
        """Fetch historical price data (OHLCV)"""
        pass

    @abstractmethod
    def get_dividends(self, ticker: str, start: str, end: str) -> List[DividendItem]:
        """Fetch historical dividend data"""
        pass

    @abstractmethod
    def search_ticker(self, query: str) -> List[SearchResult]:
        """Search for ticker information"""
        pass