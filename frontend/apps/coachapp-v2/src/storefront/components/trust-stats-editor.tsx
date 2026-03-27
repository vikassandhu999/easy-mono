import {Button, Description, Input} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {useFieldArray, type UseFormReturn} from 'react-hook-form';

import type {EditorFormValues} from '@/storefront/components/editor-schema';

export default function TrustStatsEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {
    formState: {errors},
    register,
  } = form;
  const {append, fields, remove} = useFieldArray({control: form.control, name: 'trust_stats'});

  return (
    <div className="flex flex-col gap-3">
      <Description>
        Stats shown below your hero section (e.g. &ldquo;500+ Clients&rdquo;, &ldquo;6 Years&rdquo;). Up to 4.
      </Description>

      {fields.map((field, index) => (
        <div
          className="flex items-start gap-2"
          key={field.id}
        >
          <div className="w-24 shrink-0">
            <Input
              aria-label="Value"
              placeholder="500+"
              {...register(`trust_stats.${index}.value`)}
            />
            {errors.trust_stats?.[index]?.value ? (
              <p className="text-xs text-danger">{errors.trust_stats[index].value.message}</p>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <Input
              aria-label="Label"
              placeholder="Clients"
              {...register(`trust_stats.${index}.label`)}
            />
            {errors.trust_stats?.[index]?.label ? (
              <p className="text-xs text-danger">{errors.trust_stats[index].label.message}</p>
            ) : null}
          </div>
          <Button
            isIconOnly
            onPress={() => remove(index)}
            size="sm"
            variant="ghost"
          >
            <X size={14} />
          </Button>
        </div>
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

      <p className="text-xs text-foreground-400">
        Suggested: &ldquo;X+ Clients&rdquo;, &ldquo;X Years&rdquo;, &ldquo;X&#9733; Rating&rdquo;
      </p>
    </div>
  );
}
