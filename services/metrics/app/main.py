from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.calculate import router as calculate_router

app = FastAPI(
    title="Metrics Service",
    description="Calculates performance and risk metrics",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# mount the calculate router
app.include_router(calculate_router, prefix="", tags=["calculate"])

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "metrics"}
