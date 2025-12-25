from fastapi import FastAPI

app = FastAPI(
    title="Portfolio Service",
    description="Simulates trade execution and tracks portfolio state",
    version="0.1.0"
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "portfolio"}
