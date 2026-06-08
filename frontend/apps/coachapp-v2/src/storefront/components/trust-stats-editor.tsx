import {Button, Description, Fieldset, Typography} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {type UseFormReturn, useFieldArray} from 'react-hook-form';

import {FormTextField} from '@/@components/form-fields';
import type {EditorFormValues} from '@/storefront/components/editor-schema';

export default function TrustStatsEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {control} = form;
  const {append, fields, remove} = useFieldArray({control, name: 'trust_stats'});

  return (
    <Fieldset>
      <Fieldset.Legend>Trust stats</Fieldset.Legend>
      <Description>Add up to four stats shown below your hero section</Description>

      <Fieldset.Group>
        {fields.map((field, index) => (
          <Fieldset.Group key={field.id}>
            <div className="flex items-start gap-2">
              <FormTextField
                className="w-28 shrink-0"
                control={control}
                label="Value"
                name={`trust_stats.${index}.value`}
              />
              <FormTextField
                control={control}
                fullWidth
                label="Label"
                name={`trust_stats.${index}.label`}
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
