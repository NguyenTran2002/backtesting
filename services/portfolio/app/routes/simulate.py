from fastapi import APIRouter, HTTPException
from ..schemas.models import SimulateRequest, SimulateResponse
from ..engine.simulator import run_simulation

router = APIRouter()

@router.post("/simulate", response_model=SimulateResponse)
async def simulate_endpoint(payload: SimulateRequest):
    # basic validation (engine also checks)
    if payload.initial_capital <= 0:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error": {"code": "INVALID_REQUEST", "message": "initial_capital must be positive", "details": {}}
        })
    if not payload.price_data:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error": {"code": "INSUFFICIENT_DATA", "message": "price_data must not be empty", "details": {}}
        })

    try:
        result = run_simulation(payload)  # payload is a Pydantic model
    except ValueError as e:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error": {"code": "INVALID_REQUEST", "message": str(e), "details": {}}
        })

    return {"success": True, "data": result}