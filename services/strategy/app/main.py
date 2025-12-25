from fastapi import FastAPI

app = FastAPI(
    title="Strategy Service",
    description="Generates buy/sell signals based on strategy parameters",
    version="0.1.0"
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "strategy"}
