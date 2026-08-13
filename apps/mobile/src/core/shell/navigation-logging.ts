interface NavigationStateLike {
  index?: number;
  routes: { name: string; state?: NavigationStateLike }[];
}

export function resolveActiveRouteName(state: NavigationStateLike | undefined): string | null {
  if (!state || state.routes.length === 0) {
    return null;
  }

  const activeRoute = state.routes[state.index ?? state.routes.length - 1];
  return activeRoute.state ? (resolveActiveRouteName(activeRoute.state) ?? activeRoute.name) : activeRoute.name;
}
