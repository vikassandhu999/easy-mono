import {routes} from '../routes.ts';

export function safeReturnTo(value: string | null) {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Reject URL control characters before parsing.
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) {
    return routes.home;
  }
  try {
    const url = new URL(value, 'https://clientapp.invalid');
    return [
      routes.home,
      routes.account,
      routes.progress,
      routes.messages,
      routes.forms,
      routes.training,
      routes.nutrition,
      routes.nutritionPlans,
    ].some((route) => route === url.pathname) ||
      /^\/progress\/weight\/\d{4}-\d{2}-\d{2}$/.test(url.pathname) ||
      /^\/nutrition\/(plans\/[^/]+|days\/\d{4}-\d{2}-\d{2}\/[a-z_]+)$/.test(url.pathname) ||
      /^\/(forms\/[^/]+|training\/(sessions\/[^/]+|plans\/[^/]+(?:\/workouts\/[^/]+)?))$/.test(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}`
      : routes.home;
  } catch {
    return routes.home;
  }
}

export function getReturnTo(search: string) {
  return safeReturnTo(new URLSearchParams(search).get('returnTo'));
}

export function authPath(path: string, destination: string) {
  const returnTo = safeReturnTo(destination);
  return returnTo === routes.home ? path : `${path}?${new URLSearchParams({returnTo})}`;
}
