import { HttpRequestError, type HttpClient, type HttpRequestOptions } from "../http.js";

export interface RecordedRequest {
  endpoint: string;
  searchParams?: Record<string, string | number>;
}

/**
 * Resolver for a fake HTTP request: either a canned wire response to return as
 * the parsed JSON body, or a function that throws to simulate a transport
 * failure (e.g. by throwing an `HttpRequestError`).
 */
export type FakeResponder = (request: RecordedRequest) => unknown;

/**
 * A fake `HttpClient` for tests: returns canned wire responses with no network.
 * Records every request so a test can assert request shaping (endpoint paths,
 * query params, the renamed dotted TMDB params). `responder` decides what each
 * GET resolves to; throw inside it to simulate a transport failure.
 */
export const createFakeHttpClient = (
  responder: FakeResponder,
): HttpClient & { requests: RecordedRequest[] } => {
  const requests: RecordedRequest[] = [];

  const get = async <T>(endpoint: string, options?: HttpRequestOptions): Promise<T> => {
    const request: RecordedRequest = { endpoint, searchParams: options?.searchParams };
    requests.push(request);
    return responder(request) as T;
  };

  return { get, requests };
};

/**
 * Convenience: a responder that always fails with an `HttpRequestError`.
 * `responseBody` simulates the raw error body the production adapter captures,
 * so a client that classifies failures by body (e.g. OMDB's 401 reason) can be
 * exercised without a real request.
 */
export const failWith = (
  statusCode?: number,
  isTimeout = false,
  responseBody?: string,
): FakeResponder => {
  return () => {
    throw new HttpRequestError(
      isTimeout ? "fake timeout" : `fake failure with status ${statusCode}`,
      statusCode,
      isTimeout,
      responseBody,
    );
  };
};
