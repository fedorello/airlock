"""Shared HTTP helper for the provider adapters (ADR-0007)."""

from collections.abc import Mapping

import httpx


class ProviderHttpError(Exception):
    """Raised when a provider returns a non-2xx HTTP response."""

    def __init__(self, status: int, body: str) -> None:
        super().__init__(f"Provider HTTP error {status}: {body}")
        self.status = status
        self.body = body


class ProviderResponseError(Exception):
    """Raised when a provider response does not match the expected shape."""


async def post_json(
    client: httpx.AsyncClient, url: str, headers: Mapping[str, str], body: object
) -> object:
    """POST a JSON body and return the parsed JSON response; raise on non-2xx."""
    response = await client.post(
        url, headers={"content-type": "application/json", **headers}, json=body
    )
    if response.status_code >= httpx.codes.BAD_REQUEST:
        raise ProviderHttpError(response.status_code, response.text)
    result: object = response.json()
    return result
