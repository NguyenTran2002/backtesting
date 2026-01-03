from abc import ABC, abstractmethod
from app.schemas.models import PricePoint, SignalItem

class BaseStrategy(ABC):
    @abstractmethod
    def generate_signals(self, price_data: list[PricePoint], config: dict) -> list[SignalItem]:
        """
        Abstract method to generate trading signals. 
        Must be implemented by all concrete strategy classes.
        """
        pass