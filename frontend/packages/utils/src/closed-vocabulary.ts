/**
 * Narrow an untrusted key to a closed vocabulary.
 *
 * The keys a UI hands back are `string`: a `?tab=` search param, a react-aria
 * selection `Key`, a `<select>`'s `event.target.value`. Every one of those was
 * being cast (`raw as TabId`), which is a lie the moment the vocabulary changes
 * or the URL is hand-edited. This checks the claim instead, against the same
 * array the options are rendered from — so a new member needs no change here.
 */
export function isOneOf<T extends string>(values: readonly T[], raw: unknown): raw is T {
  return values.some((value) => value === raw);
}
