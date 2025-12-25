from fastapi import FastAPI

app = FastAPI(
    title="Metrics Service",
    description="Calculates performance and risk metrics",
    version="0.1.0"
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "metrics"}
