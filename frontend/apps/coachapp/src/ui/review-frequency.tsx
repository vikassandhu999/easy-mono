import {SelectItem} from './select';
import {SelectField} from './select-field';
export function ReviewFrequency({
  value,
  onChange,
  isDisabled = false,
  label = 'Review frequency',
}: {
  value: number;
  onChange: (value: 1 | 3 | 7 | 14 | 28) => void;
  isDisabled?: boolean;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <SelectField
        aria-label={label}
        value={String(value)}
        onChange={(value) => {
          const number = Number(value);
          if (number === 1 || number === 3 || number === 7 || number === 14 || number === 28) {
            onChange(number);
          }
        }}
        isDisabled={isDisabled}
      >
        {[1, 3, 7, 14, 28].map((days) => (
          <SelectItem
            key={days}
            id={String(days)}
          >
            {days === 1 ? 'Every day' : `Every ${days} days`}
          </SelectItem>
        ))}
      </SelectField>
    </div>
  );
}
