from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# --- Price Data Models ---

class PriceRequest(BaseModel):
    """Payload for POST /prices request"""
    ticker: str
    market_type: str
    start_date: str
    end_date: str
    frequency: str = "daily"

class PriceItem(BaseModel):
    """Structure for a single OHLCV data point"""
    date: str
    open: float
    high: float
    low: float
    close: float
    adjusted_close: float  # Critical for backtesting accuracy
    volume: int

class PriceData(BaseModel):
    """Container for a list of prices associated with a ticker"""
    ticker: str
    frequency: str
    prices: List[PriceItem]

class PriceResponse(BaseModel):
    """Successful response for price history"""
    success: bool
    data: PriceData

# --- Dividend Data Models ---

class DividendRequest(BaseModel):
    """Payload for POST /dividends request"""
    ticker: str
    start_date: str
    end_date: str

class DividendItem(BaseModel):
    """Structure for a single dividend payment event"""
    ex_date: str
    payment_date: Optional[str] = None  # May be null if unavailable from source
    amount_per_share: float

class DividendData(BaseModel):
    """Container for a list of dividends associated with a ticker"""
    ticker: str
    dividends: List[DividendItem]

class DividendResponse(BaseModel):
    """Successful response for dividend history"""
    success: bool
    data: DividendData

# --- Search Models ---

class SearchResult(BaseModel):
    """Structure for a single ticker search result"""
    ticker: str
    name: str
    market_type: str
    exchange: str

class SearchData(BaseModel):
    """Container for search results list"""
    results: List[SearchResult]

class SearchResponse(BaseModel):
    """Successful response for ticker search"""
    success: bool
    data: SearchData

# --- Error Models ---

class ErrorDetail(BaseModel):
    """Standardized error details as per ARCHITECTURE.md"""
    code: str      # e.g., 'INVALID_TICKER', 'EXTERNAL_API_ERROR'
    message: str   # Human-readable error message
    details: Dict[str, Any] = {}

class ErrorResponse(BaseModel):
    """Standardized error response format for all services"""
    success: bool = False
    error: ErrorDetail