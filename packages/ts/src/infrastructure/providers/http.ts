/** The platform `fetch`, as a dependency so providers are testable. */
export type FetchLike = typeof globalThis.fetch;

/** Raised when a provider returns a non-2xx HTTP response. */
export class ProviderHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Provider HTTP error ${status}: ${body}`);
    this.name = "ProviderHttpError";
  }
}

/** Raised when a provider response does not match the expected shape. */
export class ProviderResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderResponseError";
  }
}

/** POST a JSON body and return the parsed JSON response; throw on non-2xx. */
export async function postJson(
  fetchImpl: FetchLike,
  url: string,
  headers: Readonly<Record<string, string>>,
  body: unknown,
): Promise<unknown> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ProviderHttpError(response.status, await response.text());
  }
  return response.json();
}
