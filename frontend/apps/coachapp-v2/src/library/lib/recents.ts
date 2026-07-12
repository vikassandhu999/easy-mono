import {useSyncExternalStore} from 'react';

import type {BuilderTypeKey} from '@/library/lib/builder-types';

// ponytail: client-side only (localStorage) per design decision 4 — no backend
// for recents/favourites; move server-side if cross-device sync is ever asked for.

export interface BuilderRef {
  id: string;
  /** Display name captured at interaction time; may go stale after a rename. */
  name: string;
  type: BuilderTypeKey;
}

const RECENTS_KEY = 'builder:recents';
const FAVS_KEY = 'builder:favs';
const RECENTS_MAX = 8;

const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) {
    l();
  }
};

const read = (key: string): BuilderRef[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as BuilderRef[];
  } catch {
    return [];
  }
};

let recentsCache = read(RECENTS_KEY);
let favsCache = read(FAVS_KEY);

const write = (key: string, value: BuilderRef[]) => {
  localStorage.setItem(key, JSON.stringify(value));
  emit();
};

const same = (a: BuilderRef, b: BuilderRef) => a.id === b.id && a.type === b.type;

export function pushRecent(entry: BuilderRef) {
  recentsCache = [entry, ...recentsCache.filter((r) => !same(r, entry))].slice(0, RECENTS_MAX);
  write(RECENTS_KEY, recentsCache);
}

export function toggleFav(entry: BuilderRef) {
  favsCache = favsCache.some((f) => same(f, entry)) ? favsCache.filter((f) => !same(f, entry)) : [entry, ...favsCache];
  write(FAVS_KEY, favsCache);
}

export const isFav = (favs: BuilderRef[], type: BuilderTypeKey, id: string) =>
  favs.some((f) => f.type === type && f.id === id);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useRecents = (): BuilderRef[] => useSyncExternalStore(subscribe, () => recentsCache);

export const useFavs = (): BuilderRef[] => useSyncExternalStore(subscribe, () => favsCache);
