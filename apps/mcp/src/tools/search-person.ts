import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { extractYear } from "@showtime/core";
import { pageParam } from "./helpers/params.js";

export const searchPersonTool = defineTool({
  name: "search_person",
  title: "Search Person",
  description:
    "Search for actors, directors, and other crew members by name. Returns a list of matching people with their TMDB ID (needed for filmography lookup), known department, and notable works.",
  schema: {
    query: z.string().describe("Person name to search for"),
    page: pageParam,
  },
  handler: async ({ query, page }, { tmdb }) => {
    const result = await tmdb.searchPerson(query, { page });

    const formattedResults = result.results.map((person) => ({
      tmdbId: person.id,
      name: person.name,
      knownForDepartment: person.known_for_department,
      profileImageUrl: tmdb.getImageUrl(person.profile_path, "w185"),
      knownFor: person.known_for.slice(0, 3).map((entry) => ({
        title: entry.title ?? entry.name,
        year: extractYear(entry.release_date ?? entry.first_air_date),
        tmdbId: entry.id,
      })),
    }));

    return paginatedResult(result, { results: formattedResults });
  },
});
