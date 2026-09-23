import {useSearchParams} from 'react-router-dom';

export function ReferenceNotice({revision}: {revision: number}) {
  const [params] = useSearchParams();
  const reference = Number(params.get('referenceRevision'));
  if (!Number.isInteger(reference) || reference < 1) {
    return null;
  }
  return (
    <p
      role="status"
      className="rounded-2xl bg-secondary p-3 text-sm text-muted-foreground"
    >
      {reference < revision
        ? `This record has changed since the message (revision ${reference}). You’re viewing the latest version, revision ${revision}.`
        : `You’re viewing the latest record, revision ${revision}.`}
    </p>
  );
}
