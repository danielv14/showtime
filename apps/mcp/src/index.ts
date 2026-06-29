import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createOmdbClient } from "@showtime/core";
import { createTmdbClient } from "@showtime/core";
import { registerAllTools } from "./tools/index.js";

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!OMDB_API_KEY) {
  console.error("Error: OMDB_API_KEY environment variable is required");
  console.error("Get your API key from https://www.omdbapi.com/apikey.aspx");
  process.exit(1);
}

if (!TMDB_API_KEY) {
  console.error("Error: TMDB_API_KEY environment variable is required");
  console.error("Get your API key from https://www.themoviedb.org/settings/api");
  process.exit(1);
}

const server = new McpServer({
  name: "showtime-mcp",
  version: "1.0.0",
});

const omdbClient = createOmdbClient(OMDB_API_KEY);
const tmdbClient = createTmdbClient(TMDB_API_KEY);

registerAllTools(server, omdbClient, tmdbClient);

const transport = new StdioServerTransport();
await server.connect(transport);
