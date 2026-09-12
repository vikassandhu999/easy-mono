import {useEffect, useState} from 'react';
import {useLocation, useSearchParams} from 'react-router-dom';
import {Input} from './input';

export function ListSearch({label, placeholder = 'Search by name'}: {label: string; placeholder?: string}) {
  const [params, setParams] = useSearchParams();
  const {state} = useLocation();
  const search = params.get('search') ?? '';
  const [draft, setDraft] = useState({search, value: search});
  if (draft.search !== search) {
    setDraft({search, value: draft.value.trim() === search ? draft.value : search});
  }

  useEffect(() => {
    if (draft.value.trim() === search || draft.search !== search) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (draft.value.trim()) {
            next.set('search', draft.value.trim());
          } else {
            next.delete('search');
          }
          return next;
        },
        {replace: true, preventScrollReset: true, state},
      );
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draft, search, setParams, state]);

  return (
    <div className="grid gap-2">
      <label
        htmlFor="list-search"
        className="text-sm font-medium"
      >
        {label}
      </label>
      <Input
        id="list-search"
        type="search"
        value={draft.value}
        onChange={(event) => setDraft({search, value: event.target.value})}
        placeholder={placeholder}
      />
    </div>
  );
}
