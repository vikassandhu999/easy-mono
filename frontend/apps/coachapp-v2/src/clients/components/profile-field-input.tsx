/**
 * Renders the right HeroUI v3 control for a profile field definition's type,
 * controlled via a single value/onChange. Used by the per-client profile editor.
 * Value shapes by type: text/select → string, number → number, boolean → boolean,
 * date → ISO "YYYY-MM-DD" string, multi_select → string[].
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
  Typography,
} from '@heroui/react';
import {useId} from 'react';

import DateInput from '@/@components/date-input';
import type {ClientProfileField, ProfileFieldValue} from '@/api/client-profile';

interface Props {
  field: ClientProfileField;
  value: ProfileFieldValue;
  onChange: (value: ProfileFieldValue) => void;
}

export default function ProfileFieldInput({field, value, onChange}: Props) {
  const labelId = useId();

  switch (field.field_type) {
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
            {field.label}
          </Switch.Content>
        </Switch>
      );

    case 'date':
      return (
        <DateInput
          label={field.label}
          onChange={onChange}
          value={typeof value === 'string' ? value : null}
        />
      );

    case 'multi_select':
      return (
        <div>
          <Label
            className="mb-1.5 block text-sm font-medium"
            id={labelId}
          >
            {field.label}
          </Label>
          {field.options.length === 0 ? (
            <Typography
              color="muted"
              type="body-xs"
            >
              No options defined
            </Typography>
          ) : (
            <ToggleButtonGroup
              aria-labelledby={labelId}
              className="flex flex-wrap gap-1.5"
              isDetached
              onSelectionChange={(keys) => onChange([...keys].map(String))}
              selectedKeys={Array.isArray(value) ? value : []}
              selectionMode="multiple"
              size="sm"
            >
              {field.options.map((option) => (
                <ToggleButton
                  id={option}
                  key={option}
                >
                  {option}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </div>
      );

    case 'number':
      return (
        <NumberField
          onChange={(v) => onChange(Number.isNaN(v) ? null : v)}
          value={typeof value === 'number' ? value : undefined}
          variant="secondary"
        >
          <Label>{field.label}</Label>
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      );

    case 'select':
      return (
        <Select
          onChange={(key) => onChange(key ?? null)}
          value={typeof value === 'string' ? value : null}
          variant="secondary"
        >
          <Label>{field.label}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {field.options.map((option) => (
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
          <Label>{field.label}</Label>
          <Input />
        </TextField>
      );
  }
}
