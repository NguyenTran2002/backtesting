from fastapi import APIRouter, HTTPException
from app.schemas.models import DividendRequest, DividendResponse, DividendData, ErrorResponse, ErrorDetail
from app.providers.yahoo import YahooFinanceProvider

router = APIRouter()
provider = YahooFinanceProvider()

@router.post("/dividends", response_model=DividendResponse)
async def get_dividends(request: DividendRequest):
    """
    Endpoint to retrieve historical dividend distributions.
    """
    try:
        data = provider.get_dividends(
            ticker_symbol=request.ticker,
            start=request.start_date,
            end=request.end_date
        )
        
        # Even if data is empty, some tickers simply don't pay dividends
        # We still return success but with an empty list as per instructions
        return DividendResponse(
            success=True,
            data=DividendData(
                ticker=request.ticker,
                dividends=data
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    