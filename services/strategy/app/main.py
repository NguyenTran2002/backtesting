from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import signals

app = FastAPI(
    title="Strategy Service",
    description="Generates buy/sell signals based on strategy parameters",
    version="0.1.0"
)

# CORS Configuration for cross-service communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registering the Strategy routes
app.include_router(signals.router)

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "strategy"}