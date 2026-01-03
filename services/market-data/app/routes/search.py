from fastapi import APIRouter, Query
from app.schemas.models import SearchResponse, SearchData, SearchResult
from app.providers.yahoo import YahooFinanceProvider
from typing import List

router = APIRouter()
provider = YahooFinanceProvider()

@router.get("/tickers/search", response_model=SearchResponse)
async def search_tickers(q: str = Query(..., min_length=1)):
    """
    Endpoint to search for a ticker by its symbol.
    """
    results = provider.search_ticker(q)
    
    return SearchResponse(
        success=True,
        data=SearchData(results=results)
    )