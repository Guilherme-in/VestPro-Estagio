import logging
import httpx
from typing import List
from app import schemas

logger = logging.getLogger("vestpro")

AWESOME_API_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL"
_MAX_RETRIES = 3
_RETRY_DELAY = 1.0  # segundos entre tentativas

# Cache simples em memória para evitar chamadas repetidas
_cache: dict = {"data": None, "ts": 0.0}
_CACHE_TTL = 300  # 5 minutos


async def get_exchange_rates() -> List[schemas.ExchangeRate]:
    """Busca cotações do dólar, euro e libra via AwesomeAPI com retry e cache."""
    import time

    now = time.monotonic()
    if _cache["data"] and (now - _cache["ts"]) < _CACHE_TTL:
        return _cache["data"]

    last_exc: Exception = Exception("Falha desconhecida")
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(AWESOME_API_URL)
                response.raise_for_status()
                data = response.json()

            rates = _parse_rates(data)
            _cache["data"] = rates
            _cache["ts"] = now
            return rates

        except httpx.TimeoutException:
            last_exc = Exception("Timeout ao buscar cotações")
            logger.warning("AwesomeAPI timeout (tentativa %d/%d)", attempt, _MAX_RETRIES)
        except httpx.HTTPStatusError as e:
            last_exc = e
            logger.warning("AwesomeAPI HTTP %s (tentativa %d/%d)", e.response.status_code, attempt, _MAX_RETRIES)
        except Exception as e:
            last_exc = e
            logger.warning("AwesomeAPI erro inesperado: %s (tentativa %d/%d)", e, attempt, _MAX_RETRIES)

        if attempt < _MAX_RETRIES:
            import asyncio
            await asyncio.sleep(_RETRY_DELAY * attempt)

    # Retorna cache antigo se disponível, evitando erro total
    if _cache["data"]:
        logger.warning("AwesomeAPI indisponível — retornando cache expirado")
        return _cache["data"]

    logger.error("AwesomeAPI falhou após %d tentativas: %s", _MAX_RETRIES, last_exc)
    return []


def _parse_rates(data: dict) -> List[schemas.ExchangeRate]:
    mapping = {
        "USDBRL": ("Dólar Americano", "USD"),
        "EURBRL": ("Euro", "EUR"),
        "GBPBRL": ("Libra Esterlina", "GBP"),
    }
    rates = []
    for key, (moeda, codigo) in mapping.items():
        if key in data:
            item = data[key]
            rates.append(schemas.ExchangeRate(
                moeda=moeda,
                codigo=codigo,
                bid=float(item.get("bid", 0)),
                ask=float(item.get("ask", 0)),
                updated_at=item.get("create_date", ""),
            ))
    return rates
