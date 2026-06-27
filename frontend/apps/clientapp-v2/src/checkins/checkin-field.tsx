/**
 * Renders one check-in question as the right input for its type. Value shapes:
 * text/select → string, number → number, boolean → boolean, date → ISO string,
 * multi_select → string[].
 */
import {
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import {useId} from 'react';

export type CheckinQuestion = {
  id: string;
  label: string;
  options?: string[];
  required?: boolean;
  type: string;
};

export type AnswerValue = boolean | null | number | string | string[];

function FieldLabel({children, required}: {children: string; required?: boolean}) {
  return (
    <Label className="mb-1.5 block text-sm font-medium">
      {children}
      {required ? <span className="ml-1 text-danger">*</span> : null}
    </Label>
  );
}

export default function CheckinField({
  question,
  value,
  onChange,
}: {
  onChange: (value: AnswerValue) => void;
  question: CheckinQuestion;
  value: AnswerValue;
}) {
  const labelId = useId();
  const options = question.options ?? [];

  switch (question.type) {
    case 'boolean':
      return (
        <Switch
          isSelected={value === true}
          onChange={onChange}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            {question.label}
            {question.required ? <span className="ml-1 text-danger">*</span> : null}
          </Switch.Content>
        </Switch>
      );

    case 'date':
      return (
        <div>
          <FieldLabel required={question.required}>{question.label}</FieldLabel>
          {/* Native date input — mobile-friendly and avoids an extra date dep in the client app. */}
          <input
            className="w-full rounded-lg border border-divider bg-content1 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            onChange={(e) => onChange(e.target.value || null)}
            type="date"
            value={typeof value === 'string' ? value : ''}
          />
        </div>
      );

    case 'multi_select':
      return (
        <div>
          <Label
            className="mb-1.5 block text-sm font-medium"
            id={labelId}
          >
            {question.label}
            {question.required ? <span className="ml-1 text-danger">*</span> : null}
          </Label>
          <ToggleButtonGroup
            aria-labelledby={labelId}
            className="flex flex-wrap gap-1.5"
            isDetached
            onSelectionChange={(keys) => onChange([...keys].map(String))}
            selectedKeys={Array.isArray(value) ? value : []}
            selectionMode="multiple"
            size="sm"
          >
            {options.map((option) => (
              <ToggleButton
                id={option}
                key={option}
              >
                {option}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      );

    case 'number':
      return (
        <NumberField
          onChange={(v) => onChange(Number.isNaN(v) ? null : v)}
          value={typeof value === 'number' ? value : undefined}
          variant="secondary"
        >
          <FieldLabel required={question.required}>{question.label}</FieldLabel>
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      );

    case 'select':
      return (
        <Select
          onChange={(key) => onChange(key ? String(key) : null)}
          value={typeof value === 'string' ? value : null}
          variant="secondary"
        >
          <FieldLabel required={question.required}>{question.label}</FieldLabel>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {options.map((option) => (
                <ListBox.Item
                  id={option}
                  key={option}
                  textValue={option}
                >
                  {option}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      );

    default:
      return (
        <TextField
          onChange={onChange}
          value={typeof value === 'string' ? value : ''}
          variant="secondary"
        >
          <FieldLabel required={question.required}>{question.label}</FieldLabel>
          <Input />
        </TextField>
      );
  }
}

/** A read-only "label: value" line (used after submit). */
export function AnswerDisplay({label, value}: {label: string; value: AnswerValue}) {
  const text =
    value == null || value === ''
      ? '—'
      : typeof value === 'boolean'
        ? value
          ? 'Yes'
          : 'No'
        : Array.isArray(value)
          ? value.join(', ') || '—'
          : String(value);
  return (
    <div>
      <p className="text-sm text-foreground-500">{label}</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}
