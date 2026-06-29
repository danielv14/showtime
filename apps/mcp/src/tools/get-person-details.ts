import { z } from "zod";
import { defineTool } from "./define-tool.js";

export const getPersonDetailsTool = defineTool({
  name: "get_person_details",
  title: "Get Person Details",
  description:
    "Get detailed information about an actor, director, or other crew member including biography, birthday, place of birth, and profile image. Use search_person first to get the TMDB person ID.",
  schema: {
    personId: z
      .number()
      .describe("TMDB person ID (use search_person to find this)"),
  },
  handler: async ({ personId }, { tmdb }) => {
    const person = await tmdb.getPersonDetails(personId);

    return {
      tmdbId: person.id,
      name: person.name,
      knownFor: person.known_for_department,
      biography: person.biography || "No biography available.",
      birthday: person.birthday,
      deathday: person.deathday,
      placeOfBirth: person.place_of_birth,
      imdbId: person.imdb_id,
      profileImageUrl: tmdb.getImageUrl(person.profile_path, "w500"),
    };
  },
});
