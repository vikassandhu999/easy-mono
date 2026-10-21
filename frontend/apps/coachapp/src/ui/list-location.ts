import {useLocation} from 'react-router-dom';

export function useListLocation(pathname: string) {
  const state: unknown = useLocation().state;
  const search =
    state && typeof state === 'object' && 'listSearch' in state && typeof state.listSearch === 'string'
      ? state.listSearch
      : '';
  const task = readTaskReturn(state);
  return {
    to: pathname + (search.startsWith('?') ? search : ''),
    state: {
      listSearch: search,
      ...(task ? {returnTo: task.to, returnLabel: task.label, returnListSearch: task.state.listSearch} : {}),
    },
  };
}

export function useTaskReturn() {
  return readTaskReturn(useLocation().state);
}
function readTaskReturn(state: unknown) {
  if (
    !state ||
    typeof state !== 'object' ||
    !('returnTo' in state) ||
    typeof state.returnTo !== 'string' ||
    !('returnLabel' in state) ||
    typeof state.returnLabel !== 'string'
  ) {
    return null;
  }
  try {
    const url = new URL(state.returnTo, window.location.origin);
    const listSearch =
      'returnListSearch' in state &&
      typeof state.returnListSearch === 'string' &&
      state.returnListSearch.startsWith('?')
        ? state.returnListSearch
        : '';
    return url.origin === window.location.origin
      ? {to: url.pathname + url.search, label: state.returnLabel, state: {listSearch}}
      : null;
  } catch {
    return null;
  }
}
