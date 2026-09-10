import {useLocation} from 'react-router-dom';

export function useListLocation(pathname: string) {
  const state: unknown = useLocation().state;
  const search =
    state && typeof state === 'object' && 'listSearch' in state && typeof state.listSearch === 'string'
      ? state.listSearch
      : '';
  return {to: pathname + (search.startsWith('?') ? search : ''), state: {listSearch: search}};
}
