import {useParams} from 'react-router-dom';

/**
 * A path segment the route pattern guarantees — the `:id` in a detail route.
 *
 * `useParams` types every segment optional, and screens papered over that two
 * ways — `id!` (a lint warning per screen) or `id = ''`, which sends a request
 * for the empty id and shows the coach a generic load error. Neither is reachable
 * from a route that cannot match without the segment; if one is ever wired that
 * way, this fails loudly at the screen rather than quietly at the API.
 */
export function useRouteParam(name: string): string {
  const value = useParams()[name];
  if (value === undefined) {
    throw new Error(`Route param :${name} is missing — this screen is mounted on a route without it.`);
  }
  return value;
}
