import type { ReactNode } from "react";

/**
 * The muted, centred paragraph shown when a list-style view has nothing to
 * render: no matching browse/search results, or an empty collection. The only
 * thing that varies between those cases is the message, so the styling lives
 * here once and each view passes its own copy as `children`.
 */
export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="py-16 text-center text-sm text-zinc-500">{children}</p>
);
