from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.simulate import router as simulate_router  # <--- add this import


app = FastAPI(
    title="Portfolio Service",
    description="Simulates trade execution and tracks portfolio state",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# mount the simulate router
app.include_router(simulate_router, prefix="", tags=["simulate"])


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "portfolio"}
