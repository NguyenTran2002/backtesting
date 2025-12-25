from fastapi import FastAPI

app = FastAPI(
    title="Orchestrator Service",
    description="Main entry point for the backtesting platform",
    version="0.1.0"
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "orchestrator"}
