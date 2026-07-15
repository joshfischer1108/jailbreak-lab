import { useEffect, useState } from "react";

// A tiny hash router — two views only. Hash routing needs zero server config, so
// it works on any static host (nginx / Vercel). In-page anchors like #challenge
// and #lab still resolve to "home".
export type Route = "home" | "agent";

function routeFromHash(): Route {
  return window.location.hash.startsWith("#/agent") ? "agent" : "home";
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(routeFromHash());
  useEffect(() => {
    const onChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(route: Route) {
  window.location.hash = route === "agent" ? "#/agent" : "#/";
}
