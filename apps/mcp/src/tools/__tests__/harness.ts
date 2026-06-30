import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient, TmdbClient } from "@showtime/core";
import { buildTmdbImageUrl } from "@showtime/core";
import { registerTool, type AnyToolDefinition, type ToolClients } from "../define-tool.js";

/**
 * The MCP response shape every tool resolves to. The runner always returns a
 * `content` array; an error response additionally carries `isError: true`.
 */
export interface ToolResponse {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

/**
 * A registered tool ready to invoke. `invoke` drives the handler through the
 * real {@link registerTool} runner, so success/paginated/error response shaping
 * is exercised end-to-end, not bypassed by calling the handler directly.
 */
export interface RegisteredTestTool {
  name: string;
  invoke: (args: Record<string, unknown>) => Promise<ToolResponse>;
}

/**
 * Register a tool against a fake `McpServer` that captures the callback the
 * runner installs. Returns an `invoke` that runs that callback with the given
 * args, so a test exercises registration plus the runner's response shaping
 * over an injected pair of fake clients.
 */
export const registerTestTool = (
  definition: AnyToolDefinition,
  clients: ToolClients,
): RegisteredTestTool => {
  let captured: ((args: Record<string, unknown>) => Promise<ToolResponse>) | undefined;

  const fakeServer = {
    registerTool: (
      _name: string,
      _config: unknown,
      cb: (args: Record<string, unknown>) => Promise<ToolResponse>,
    ) => {
      captured = cb;
    },
  } as unknown as McpServer;

  registerTool(fakeServer, definition, clients);

  if (!captured) {
    throw new Error(`Tool "${definition.name}" did not register a handler`);
  }
  const handler = captured;

  return {
    name: definition.name,
    invoke: (args: Record<string, unknown>) => handler(args),
  };
};

/** Parse the JSON text payload of a success response back into a value. */
export const parseSuccess = (response: ToolResponse): unknown =>
  JSON.parse(response.content[0]?.text ?? "null");

/**
 * Build a fake `TmdbClient` from a partial set of methods. Only the methods a
 * tool under test calls need to be supplied; `getImageUrl` defaults to the real
 * pure URL builder so formatters produce realistic output. Unsupplied methods
 * throw if called, surfacing an unexpected upstream call in a test.
 */
export const createFakeTmdbClient = (overrides: Partial<TmdbClient>): TmdbClient => {
  const getImageUrl: TmdbClient["getImageUrl"] = (path, size) => buildTmdbImageUrl(path, size);
  return new Proxy({ getImageUrl, ...overrides } as TmdbClient, {
    get(target, prop: string) {
      if (prop in target) {
        return target[prop as keyof TmdbClient];
      }
      return () => {
        throw new Error(`Unexpected TMDB call: ${prop}`);
      };
    },
  });
};

/** Build a fake `OmdbClient` from a partial set of methods (see above). */
export const createFakeOmdbClient = (overrides: Partial<OmdbClient>): OmdbClient =>
  new Proxy({ ...overrides } as OmdbClient, {
    get(target, prop: string) {
      if (prop in target) {
        return target[prop as keyof OmdbClient];
      }
      return () => {
        throw new Error(`Unexpected OMDB call: ${prop}`);
      };
    },
  });

/** A fake client pair, defaulting either side to an empty (call-throwing) fake. */
export const createFakeClients = (overrides: {
  tmdb?: Partial<TmdbClient>;
  omdb?: Partial<OmdbClient>;
}): ToolClients => ({
  tmdb: createFakeTmdbClient(overrides.tmdb ?? {}),
  omdb: createFakeOmdbClient(overrides.omdb ?? {}),
});
