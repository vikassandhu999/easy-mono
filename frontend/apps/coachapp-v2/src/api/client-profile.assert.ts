/**
 * Assert-style checks for the section-merge logic in client-profile.ts.
 * The data-loss risk: the backend replaces a whole section map per PATCH, so we
 * must spread the existing section to preserve keys not shown in the editor.
 *
 * Run directly: npx tsx client-profile.assert.ts
 * No test framework required. Mirrors buildProfileSectionsPayload exactly.
 */

type Value = boolean | null | number | string | string[];
type Section = 'general' | 'lifestyle' | 'nutrition' | 'training';
type Field = {id: string; key: string; section: Section};
type Sections = Record<Section, Record<string, unknown>>;

function isEmpty(value: Value | undefined): boolean {
  if (value == null || value === '') {
    return true;
  }
  return Array.isArray(value) && value.length === 0;
}

function buildSections(fields: Field[], existing: Sections, valuesByFieldId: Record<string, Value>): Sections {
  const sections: Sections = {
    general: {...existing.general},
    lifestyle: {...existing.lifestyle},
    nutrition: {...existing.nutrition},
    training: {...existing.training},
  };
  for (const field of fields) {
    const section = sections[field.section];
    const value = valuesByFieldId[field.id];
    if (isEmpty(value)) {
      delete section[field.key];
    } else {
      section[field.key] = value;
    }
  }
  return sections;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function empty(): Sections {
  return {general: {}, lifestyle: {}, nutrition: {}, training: {}};
}

function demo(): void {
  // 1. Sets a known field value into its section.
  const r1 = buildSections([{id: 'f1', key: 'goal', section: 'general'}], empty(), {f1: 'strength'});
  assert(r1.general.goal === 'strength', 'writes value to section by field.key');

  // 2. Preserves an existing key NOT backed by any editor field (the data-loss guard).
  const r2 = buildSections(
    [{id: 'f1', key: 'goal', section: 'general'}],
    {...empty(), general: {legacy_answer: 42}},
    {f1: 'strength'},
  );
  assert(r2.general.legacy_answer === 42, 'preserves unknown existing key');
  assert(r2.general.goal === 'strength', 'still writes the edited field');

  // 3. Clearing a value deletes its key (but leaves unknown keys intact).
  const r3 = buildSections(
    [{id: 'f1', key: 'goal', section: 'general'}],
    {...empty(), general: {goal: 'old', keep: 'me'}},
    {f1: ''},
  );
  assert(!('goal' in r3.general), 'cleared value deletes its key');
  assert(r3.general.keep === 'me', 'clearing one key leaves others');

  // 4. Empty array (unselected multi_select) counts as empty.
  const r4 = buildSections(
    [{id: 'f1', key: 'tags', section: 'training'}],
    {...empty(), training: {tags: ['a']}},
    {f1: []},
  );
  assert(!('tags' in r4.training), 'empty array clears the key');

  // 5. boolean false is a real answer, not empty.
  const r5 = buildSections([{id: 'f1', key: 'vegan', section: 'nutrition'}], empty(), {f1: false});
  assert(r5.nutrition.vegan === false, 'false is stored, not dropped');

  // 6. number 0 is a real answer, not empty.
  const r6 = buildSections([{id: 'f1', key: 'kids', section: 'lifestyle'}], empty(), {f1: 0});
  assert(r6.lifestyle.kids === 0, 'zero is stored, not dropped');

  console.log('\nAll assertions passed.');
}

demo();
