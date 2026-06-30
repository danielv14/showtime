import ky, { HTTPError, TimeoutError, type KyInstance, type Options } from "ky";

/**
 * The injectable HTTP seam the core clients depend on. Both the TMDB and OMDB
 * clients only ever issue GET requests with query params and parse a JSON body,
 * so the interface is deliberately tiny. Production uses `createHttpClient`
 * (real ky); tests pass a fake that returns canned wire responses with no
 * network. Keeping this transport-neutral means no client method needs a real
 * request to be exercised.
 */
export interface HttpRequestOptions {
  searchParams?: Record<string, string | number>;
}

export interface HttpClient {
  get: <T>(endpoint: string, options?: HttpRequestOptions) => Promise<T>;
}

/**
 * Transport-neutral failure thrown by the production adapter when the
 * underlying request fails (a non-2xx response or a timeout). It carries just
 * enough context for a client to translate it into its own domain error
 * (e.g. `TmdbApiError`) without leaking ky's error types past the seam:
 * the status code, whether it was a timeout, and the raw response body when
 * there was one. The body matters because some upstreams (OMDB) encode the
 * real reason for a failure in it even on a 401, so a client can tell a
 * rate-limit apart from a bad key. A fake adapter throws this to simulate a
 * transport failure in tests.
 */
export class HttpRequestError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isTimeout: boolean = false,
    public responseBody?: string,
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}

/**
 * The retry/timeout policy shared by every upstream client. Defined once here
 * so the two clients cannot drift apart: a 30s timeout with up to two retries
 * on the transient status codes. Per-client concerns (TMDB's bearer auth, OMDB's
 * `apikey` query param) are layered on top by each adapter, not encoded here.
 */
export const SHARED_KY_CONFIG: Pick<Options, "timeout" | "retry"> = {
  timeout: 30000,
  retry: {
    limit: 2,
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
};

/**
 * Build the production HTTP adapter: a thin wrapper over a configured ky
 * instance that issues GETs and parses JSON. Transport errors (`HTTPError`,
 * `TimeoutError`) are translated into the transport-neutral `HttpRequestError`
 * so the seam never exposes ky's types. `prefixUrl` and any per-client headers
 * are supplied by the caller; the shared retry/timeout policy is applied here.
 */
export const createHttpClient = (config: {
  prefixUrl: string;
  headers?: Record<string, string>;
}): HttpClient => {
  const kyClient: KyInstance = ky.create({
    prefixUrl: config.prefixUrl,
    headers: config.headers,
    ...SHARED_KY_CONFIG,
  });

  const get = async <T>(endpoint: string, options?: HttpRequestOptions): Promise<T> => {
    try {
      return await kyClient.get(endpoint, { searchParams: options?.searchParams }).json<T>();
    } catch (error) {
      if (error instanceof HTTPError) {
        // Capture the response body so a client can read an upstream's encoded
        // failure reason (e.g. OMDB's `Error` field on a 401). Clone first so
        // reading it here cannot interfere with the response elsewhere, and
        // swallow a read failure: the status code is the important part.
        const responseBody = await error.response
          .clone()
          .text()
          .catch(() => undefined);
        throw new HttpRequestError(
          `Request to ${endpoint} failed with status ${error.response.status}`,
          error.response.status,
          false,
          responseBody,
        );
      }
      if (error instanceof TimeoutError) {
        throw new HttpRequestError(`Request to ${endpoint} timed out`, undefined, true);
      }
      throw error;
    }
  };

  return { get };
};
