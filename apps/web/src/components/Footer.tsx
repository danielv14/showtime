const Footer = () => (
  <footer className="mt-16 border-t border-white/5 py-8">
    <div className="mx-auto max-w-6xl px-4 text-xs leading-relaxed text-zinc-500 sm:px-6">
      <p>
        Showtime uses the{" "}
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-zinc-200"
        >
          TMDB
        </a>{" "}
        and{" "}
        <a
          href="https://www.omdbapi.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-zinc-200"
        >
          OMDb
        </a>{" "}
        APIs but is not endorsed or certified by either. Streaming data by
        JustWatch.
      </p>
    </div>
  </footer>
);

export default Footer;
