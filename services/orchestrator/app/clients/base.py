import httpx
from typing import Any, Dict, Optional


class ServiceError(Exception):
    """Base exception for service errors."""
    def __init__(self, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


class ServiceUnavailableError(ServiceError):
    """Raised when a downstream service is unreachable."""
    pass


class ServiceRequestError(ServiceError):
    """Raised when a downstream service returns an error response."""
    pass


class BaseClient:
    """Base async HTTP client for downstream service communication."""

    def __init__(self, base_url: str, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def _request(
        self,
        method: str,
        path: str,
        json: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make an HTTP request to the service."""
        url = f"{self.base_url}{path}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(method, url, json=json)
                data = response.json()

                if response.status_code >= 400:
                    error = data.get("error", {})
                    raise ServiceRequestError(
                        code=error.get("code", "UNKNOWN_ERROR"),
                        message=error.get("message", f"Service returned {response.status_code}"),
                        details=error.get("details", {})
                    )

                return data

        except httpx.ConnectError as e:
            raise ServiceUnavailableError(
                code="SERVICE_UNAVAILABLE",
                message=f"Cannot connect to service at {self.base_url}",
                details={"error": str(e)}
            )
        except httpx.TimeoutException as e:
            raise ServiceUnavailableError(
                code="SERVICE_TIMEOUT",
                message=f"Service at {self.base_url} timed out",
                details={"error": str(e)}
            )
        except httpx.HTTPError as e:
            raise ServiceUnavailableError(
                code="SERVICE_ERROR",
                message=f"HTTP error communicating with {self.base_url}",
                details={"error": str(e)}
            )

    async def get(self, path: str) -> Dict[str, Any]:
        """Make a GET request."""
        return await self._request("GET", path)

    async def post(self, path: str, json: Dict[str, Any]) -> Dict[str, Any]:
        """Make a POST request."""
        return await self._request("POST", path, json=json)

    async def health_check(self) -> bool:
        """Check if the service is healthy."""
        try:
            result = await self.get("/health")
            return result.get("status") == "healthy"
        except ServiceError:
            return False
