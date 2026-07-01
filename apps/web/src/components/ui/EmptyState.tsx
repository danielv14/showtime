import type { ReactNode } from "react";

/** The muted, centred paragraph shown when a list-style view has nothing to render. */
export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="py-16 text-center text-sm text-zinc-500">{children}</p>
);
