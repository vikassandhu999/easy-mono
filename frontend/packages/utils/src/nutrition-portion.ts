export type NutritionPortionWire = {
  amount: null | number;
  grams: null | number;
  kind: 'gram' | 'serving';
  label: null | string;
  unit: null | string;
};

export type NutritionPortionInputWire = {
  amount?: null | number;
  grams?: null | number;
  kind: 'gram' | 'serving';
  label?: null | string;
  unit?: null | string;
};

export type ParsedGramPortion = {kind: 'gram'; grams: number};
export type ParsedServingPortion = {kind: 'serving'; amount: number; label: null | string; unit: string};
export type ParsedNutritionPortion = ParsedGramPortion | ParsedServingPortion;

export function parseNutritionPortion(portion: NutritionPortionWire): ParsedNutritionPortion | null {
  switch (portion.kind) {
    case 'gram':
      if (portion.grams != null) {
        return {grams: portion.grams, kind: 'gram'};
      }
      return null;
    case 'serving':
      if (portion.amount != null && portion.unit != null) {
        return {amount: portion.amount, kind: 'serving', label: portion.label, unit: portion.unit};
      }
      return null;
    default: {
      const _exhaustive: never = portion.kind;
      return _exhaustive;
    }
  }
}

export function formatParsedPortion(portion: ParsedNutritionPortion): string {
  switch (portion.kind) {
    case 'gram':
      return `${portion.grams}g`;
    case 'serving': {
      const unit = portion.label ?? portion.unit;
      const plural = unit && portion.amount !== 1 && !unit.endsWith('s') ? 's' : '';
      const unitStr = unit ? ` ${unit}${plural}` : '';
      return `${portion.amount}${unitStr}`;
    }
    default: {
      const _exhaustive: never = portion;
      return _exhaustive;
    }
  }
}

export function toPortionInput(parsed: ParsedNutritionPortion): NutritionPortionInputWire {
  switch (parsed.kind) {
    case 'gram':
      return {grams: parsed.grams, kind: 'gram'};
    case 'serving':
      return {amount: parsed.amount, kind: 'serving', label: parsed.label, unit: parsed.unit};
    default: {
      const _exhaustive: never = parsed;
      return _exhaustive;
    }
  }
}

export function toPortionWire(parsed: ParsedNutritionPortion): NutritionPortionWire {
  switch (parsed.kind) {
    case 'gram':
      return {amount: null, grams: parsed.grams, kind: 'gram', label: null, unit: null};
    case 'serving':
      return {amount: parsed.amount, grams: null, kind: 'serving', label: parsed.label, unit: parsed.unit};
    default: {
      const _exhaustive: never = parsed;
      return _exhaustive;
    }
  }
}

export function portionWireFromInput(input: NutritionPortionInputWire): NutritionPortionWire {
  const wire: NutritionPortionWire = {
    amount: input.amount ?? null,
    grams: input.grams ?? null,
    kind: input.kind,
    label: input.label ?? null,
    unit: input.unit ?? null,
  };
  const parsed = parseNutritionPortion(wire);
  return parsed ? toPortionWire(parsed) : wire;
}
