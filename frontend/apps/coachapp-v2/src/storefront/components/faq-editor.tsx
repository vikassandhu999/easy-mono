import {Button, Description, Input, TextArea} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {useFieldArray, type UseFormReturn} from 'react-hook-form';

import type {EditorFormValues} from '@/storefront/components/editor-schema';

export default function FaqEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {
    formState: {errors},
    register,
  } = form;
  const {append, fields, remove} = useFieldArray({control: form.control, name: 'faq_items'});

  return (
    <div className="flex flex-col gap-3">
      <Description>Common questions visitors might have. Helps overcome hesitation.</Description>

      {fields.map((field, index) => (
        <div
          className="flex flex-col gap-2 rounded-xl border border-divider bg-content1 p-3"
          key={field.id}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Input
                aria-label="Question"
                placeholder="How does the coaching work?"
                {...register(`faq_items.${index}.question`)}
              />
              {errors.faq_items?.[index]?.question ? (
                <p className="text-xs text-danger">{errors.faq_items[index].question.message}</p>
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
          <TextArea
            aria-label="Answer"
            placeholder="After you apply, I'll review your details and create a custom plan..."
            rows={2}
            {...register(`faq_items.${index}.answer`)}
          />
          {errors.faq_items?.[index]?.answer ? (
            <p className="text-xs text-danger">{errors.faq_items[index].answer.message}</p>
          ) : null}
        </div>
      ))}

      <Button
        className="self-start"
        onPress={() => append({answer: '', question: ''})}
        size="sm"
        variant="ghost"
      >
        <Plus size={14} />
        Add FAQ
      </Button>

      <p className="text-xs text-foreground-400">
        Suggested: &ldquo;What does the program include?&rdquo;, &ldquo;What if I&apos;m not seeing results?&rdquo;,
        &ldquo;How do I pay?&rdquo;
      </p>
    </div>
  );
}
