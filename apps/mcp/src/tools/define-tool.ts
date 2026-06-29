import type { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "@showtime/core";
import type { TmdbClient } from "@showtime/core";
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
} from "./helpers/response.js";

/** Clients injected into every handler; a tool destructures only what it needs. */
export interface ToolClients {
  tmdb: TmdbClient;
  omdb: OmdbClient;
}

/**
 * A tool declaration: a schema plus a pure handler. The handler returns the
 * success payload (or a {@link paginatedResult}) or throws on failure. It never
 * builds MCP responses itself; the registration runner shapes the result.
 */
export interface ToolDefinition<Shape extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  schema: Shape;
  handler: (args: z.infer<z.ZodObject<Shape>>, clients: ToolClients) => Promise<unknown>;
}

/** Identity helper that preserves per-tool schema inference for the handler args. */
export const defineTool = <Shape extends z.ZodRawShape>(
  definition: ToolDefinition<Shape>,
): ToolDefinition<Shape> => definition;

/**
 * A tool definition with its schema shape erased. Used to hold tools of
 * different schemas in one registry; `any` is required here because each
 * definition's handler is typed against its own concrete schema.
 */
export type AnyToolDefinition = ToolDefinition<any>;

const PAGINATED = Symbol("paginatedResult");

interface PaginatedResult {
  [PAGINATED]: true;
  apiResponse: { total_results: number; page: number; total_pages: number };
  data: Record<string, unknown>;
}

/**
 * Wrap a handler payload that carries pagination metadata. The runner detects
 * this brand and shapes it with {@link createPaginatedResponse}.
 */
export const paginatedResult = (
  apiResponse: { total_results: number; page: number; total_pages: number },
  data: Record<string, unknown>,
): PaginatedResult => ({ [PAGINATED]: true, apiResponse, data });

const isPaginatedResult = (value: unknown): value is PaginatedResult =>
  typeof value === "object" && value !== null && PAGINATED in value;

/**
 * Thrown by {@link failWith} to surface a response that some helper has already
 * formatted (e.g. the structured error from `requireAtLeastOne` or the resolver
 * helpers) through the runner's single catch, without it being re-wrapped.
 */
export class ToolResponseError extends Error {
  constructor(public readonly response: ReturnType<typeof createErrorResponse>) {
    super("tool response");
    this.name = "ToolResponseError";
  }
}

/** Abort the current handler and return an already-formatted MCP response. */
export const failWith = (response: ReturnType<typeof createErrorResponse>): never => {
  throw new ToolResponseError(response);
};

/** Error-handling context for a tool, derived once from its title. */
const errorContext = (definition: AnyToolDefinition): string => definition.title.toLowerCase();

/**
 * Register a {@link ToolDefinition} on the server. One try/catch wraps every
 * handler: a returned payload becomes a success (or paginated) response, and a
 * thrown error becomes an error response with the tool's derived context.
 */
export const registerTool = (
  server: McpServer,
  definition: AnyToolDefinition,
  clients: ToolClients,
) => {
  server.registerTool(
    definition.name,
    {
      title: definition.title,
      description: definition.description,
      inputSchema: definition.schema,
    },
    async (args: z.infer<z.ZodObject<z.ZodRawShape>>) => {
      try {
        const result = await definition.handler(args, clients);
        if (isPaginatedResult(result)) {
          return createPaginatedResponse(result.apiResponse, result.data);
        }
        return createSuccessResponse(result);
      } catch (error) {
        if (error instanceof ToolResponseError) {
          return error.response;
        }
        return createErrorResponse(errorContext(definition), error);
      }
    },
  );
};
