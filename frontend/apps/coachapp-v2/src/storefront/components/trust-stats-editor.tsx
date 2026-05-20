import {Button, Description, FieldError, Fieldset, Input, Label, TextField, Typography} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {Controller, useFieldArray, type UseFormReturn} from 'react-hook-form';

import type {EditorFormValues} from '@/storefront/components/editor-schema';

export default function TrustStatsEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {
    control,
    formState: {errors},
  } = form;
  const {append, fields, remove} = useFieldArray({control, name: 'trust_stats'});

  return (
    <Fieldset>
      <Fieldset.Legend>Trust stats</Fieldset.Legend>
      <Description>Add up to four stats shown below your hero section</Description>

      <Fieldset.Group>
        {fields.map((field, index) => (
          <Fieldset.Group key={field.id}>
            <div className="flex items-start gap-2">
              <Controller
                control={control}
                name={`trust_stats.${index}.value`}
                render={({field: valueField}) => (
                  <TextField
                    className="w-28 shrink-0"
                    isInvalid={!!errors.trust_stats?.[index]?.value}
                    name={valueField.name}
                    onBlur={valueField.onBlur}
                    onChange={valueField.onChange}
                    value={valueField.value}
                  >
                    <Label>Value</Label>
                    {errors.trust_stats?.[index]?.value && (
                      <FieldError>{errors.trust_stats[index].value.message}</FieldError>
                    )}
                    <Input />
                  </TextField>
                )}
              />
              <Controller
                control={control}
                name={`trust_stats.${index}.label`}
                render={({field: labelField}) => (
                  <TextField
                    fullWidth
                    isInvalid={!!errors.trust_stats?.[index]?.label}
                    name={labelField.name}
                    onBlur={labelField.onBlur}
                    onChange={labelField.onChange}
                    value={labelField.value}
                  >
                    <Label>Label</Label>
                    {errors.trust_stats?.[index]?.label && (
                      <FieldError>{errors.trust_stats[index].label.message}</FieldError>
                    )}
                    <Input />
                  </TextField>
                )}
              />
              <Button
                aria-label={`Remove stat ${index + 1}`}
                isIconOnly
                onPress={() => remove(index)}
                size="sm"
                variant="ghost"
              >
                <X size={14} />
              </Button>
            </div>
          </Fieldset.Group>
        ))}

        {fields.length < 4 ? (
          <Button
            className="self-start"
            onPress={() => append({label: '', value: ''})}
            size="sm"
            variant="ghost"
          >
            <Plus size={14} />
            Add stat
          </Button>
        ) : null}

        <Typography
          color="muted"
          type="body-xs"
        >
          Suggested: 500+ clients, 6 years, or 4.9 rating
        </Typography>
      </Fieldset.Group>
    </Fieldset>
  );
}
