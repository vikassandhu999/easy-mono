import {matchPath} from 'react-router-dom';
import {routes} from '../routes.ts';

const publicRoutes = new Set<string>([routes.login, routes.signup, routes.verify, routes.setup, routes.invitation]);

function safeReturnTo(value: string | null): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Reject URL control characters before normalization.
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) {
    return routes.home;
  }
  try {
    const url = new URL(value, 'https://coachapp.invalid');
    const pathname = decodeURIComponent(url.pathname);
    const protectedRoute = Object.values(routes).some(
      (pattern) => !publicRoutes.has(pattern) && matchPath(pattern, pathname),
    );
    return protectedRoute ? `${url.pathname}${url.search}${url.hash}` : routes.home;
  } catch {
    return routes.home;
  }
}

export function getReturnTo(search: string): string {
  return safeReturnTo(new URLSearchParams(search).get('returnTo'));
}

export function authPath(path: string, destination: string): string {
  const returnTo = safeReturnTo(destination);
  return returnTo === routes.home ? path : `${path}?${new URLSearchParams({returnTo})}`;
}
