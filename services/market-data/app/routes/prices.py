from fastapi import APIRouter, HTTPException
from app.schemas.models import PriceRequest, PriceResponse, PriceData, ErrorResponse, ErrorDetail
from app.providers.yahoo import YahooFinanceProvider

# Create a router for price-related endpoints
router = APIRouter()
# Initialize the Yahoo provider
provider = YahooFinanceProvider()

@router.post("/prices", response_model=PriceResponse)
async def get_prices(request: PriceRequest):
    """
    Endpoint to retrieve historical OHLCV data.
    """
    try:
        # Fetch data using the provider logic
        data = provider.get_prices(
            ticker_symbol=request.ticker,
            start=request.start_date,
            end=request.end_date,
            frequency=request.frequency
        )
        
        # If no data is returned, return the standardized error format
        if not data:
            return ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="INVALID_TICKER",
                    message=f"No price data found for ticker '{request.ticker}'",
                    details={}
                )
            )

        # Wrap data into the success response model
        return PriceResponse(
            success=True,
            data=PriceData(
                ticker=request.ticker,
                frequency=request.frequency,
                prices=data
            )
        )
    except Exception as e:
        # Standard HTTP 500 for unexpected backend errors
        raise HTTPException(status_code=500, detail=str(e))