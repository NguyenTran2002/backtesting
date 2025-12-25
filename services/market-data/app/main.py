from fastapi import FastAPI

app = FastAPI(
    title="Market Data Service",
    description="Fetches historical price and dividend data",
    version="0.1.0"
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "market-data"}
