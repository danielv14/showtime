import { Link } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { SearchBar } from "./SearchBar";

const Header = () => (
  <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
    <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
      <Link
        to="/"
        className="flex shrink-0 items-center gap-2 text-zinc-100 no-underline transition hover:text-white"
      >
        <Clapperboard className="h-6 w-6 text-amber-400" />
        <span className="text-lg font-bold tracking-tight">Showtime</span>
      </Link>
      <div className="ml-auto w-full max-w-sm">
        <SearchBar />
      </div>
    </div>
  </header>
);

export default Header;
