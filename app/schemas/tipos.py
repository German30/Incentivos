from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer

# Los cálculos se hacen en Decimal para no perder centavos; en el JSON viaja como número.
Numero = Annotated[Decimal, PlainSerializer(float, return_type=float)]
