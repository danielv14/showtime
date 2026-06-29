import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import Footer from "../components/Footer";
import Header from "../components/Header";

import appCss from "../styles.css?url";

const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className="dark">
    <head>
      <HeadContent />
    </head>
    <body className="min-h-screen antialiased">
      <Header />
      {children}
      <Footer />
      <TanStackDevtools
        config={{ position: "bottom-right" }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Showtime — Movies & TV" },
      {
        name: "description",
        content:
          "Browse trending movies and TV shows, search, and find where to watch.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootDocument,
});
