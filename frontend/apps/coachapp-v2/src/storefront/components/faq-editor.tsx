import {Button, Card, Description, Fieldset, Typography} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {type UseFormReturn, useFieldArray} from 'react-hook-form';

import {FormTextAreaField, FormTextField} from '@/@components/form-fields';
import type {EditorFormValues} from '@/storefront/components/editor-schema';

export default function FaqEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {control} = form;
  const {append, fields, remove} = useFieldArray({control, name: 'faq_items'});

  return (
    <Fieldset>
      <Fieldset.Legend>FAQs</Fieldset.Legend>
      <Description>Answer common questions visitors may have before they apply</Description>

      <Fieldset.Group>
        {fields.map((field, index) => (
          <Card key={field.id}>
            <Card.Content className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <FormTextField
                  control={control}
                  fullWidth
                  label="Question"
                  name={`faq_items.${index}.question`}
                />
                <Button
                  aria-label={`Remove FAQ ${index + 1}`}
                  isIconOnly
                  onPress={() => remove(index)}
                  size="sm"
                  variant="ghost"
                >
                  <X size={14} />
                </Button>
              </div>

              <FormTextAreaField
                control={control}
                fullWidth
                label="Answer"
                name={`faq_items.${index}.answer`}
                textAreaProps={{rows: 2}}
              />
            </Card.Content>
          </Card>
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

        <Typography
          color="muted"
          type="body-xs"
        >
          Suggested: What does the program include? What if I am not seeing results? How do I pay?
        </Typography>
      </Fieldset.Group>
    </Fieldset>
  );
}
