from fastapi import APIRouter
from app.schemas.models import SignalRequest, SignalResponse, SignalData
from app.strategies.buy_and_hold import BuyAndHold
from app.strategies.buy_the_dip import BuyTheDip

router = APIRouter()

# Strategy Factory mapping string types to implementation classes
STRATEGY_MAP = {
    "buy_and_hold": BuyAndHold(),
    "buy_the_dip": BuyTheDip()
}

@router.post("/signals", response_model=SignalResponse)
async def get_signals(request: SignalRequest):
    strategy = STRATEGY_MAP.get(request.strategy_type)
    
    # Handle unknown strategy types
    if not strategy:
        return SignalResponse(
            success=False,
            error={
                "code": "STRATEGY_NOT_FOUND",
                "message": f"Unknown strategy type: '{request.strategy_type}'",
                "details": {"supported_strategies": list(STRATEGY_MAP.keys())}
            }
        )
    
    # Generate signals using the selected strategy
    signals = strategy.generate_signals(request.price_data, request.config.dict())
    
    return SignalResponse(
        success=True,
        data=SignalData(
            strategy_type=request.strategy_type,
            signals=signals,
            total_signals=len(signals)
        )
    )