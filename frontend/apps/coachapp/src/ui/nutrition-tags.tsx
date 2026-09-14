import type {FoodCreate} from '../api/foods';
import {Checkbox} from './checkbox';

const groups = [
  {
    name: 'allergens',
    label: 'Allergens',
    options: ['dairy', 'egg', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'wheat', 'soy', 'sesame'],
  },
  {
    name: 'dietary_tags',
    label: 'Dietary tags',
    options: [
      'vegan',
      'vegetarian',
      'halal',
      'kosher',
      'gluten_free',
      'dairy_free',
      'low_fodmap',
      'keto',
      'high_protein',
    ],
  },
] as const;

type Values = Required<Pick<FoodCreate, 'allergens' | 'dietary_tags'>>;
export function NutritionTags({
  value,
  onChange,
  isDisabled = false,
}: {
  value: Values;
  onChange: (field: keyof Values, values: string[]) => void;
  isDisabled?: boolean;
}) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <fieldset
          key={group.name}
          className="space-y-2"
        >
          <legend className="text-sm font-medium">{group.label}</legend>
          <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
            {group.options.map((option) => (
              <Checkbox
                key={option}
                isDisabled={isDisabled}
                isSelected={value[group.name].includes(option)}
                onChange={(selected) =>
                  onChange(
                    group.name,
                    selected ? [...value[group.name], option] : value[group.name].filter((tag) => tag !== option),
                  )
                }
              >
                <span className="capitalize">{option.replaceAll('_', ' ')}</span>
              </Checkbox>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
