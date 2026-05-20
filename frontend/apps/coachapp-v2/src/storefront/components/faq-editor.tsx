import {
  Button,
  Card,
  Description,
  FieldError,
  Fieldset,
  Input,
  Label,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {Controller, useFieldArray, type UseFormReturn} from 'react-hook-form';

import type {EditorFormValues} from '@/storefront/components/editor-schema';

export default function FaqEditor({form}: {form: UseFormReturn<EditorFormValues>}) {
  const {
    control,
    formState: {errors},
  } = form;
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
                <Controller
                  control={control}
                  name={`faq_items.${index}.question`}
                  render={({field: questionField}) => (
                    <TextField
                      fullWidth
                      isInvalid={!!errors.faq_items?.[index]?.question}
                      name={questionField.name}
                      onBlur={questionField.onBlur}
                      onChange={questionField.onChange}
                      value={questionField.value}
                    >
                      <Label>Question</Label>
                      {errors.faq_items?.[index]?.question && (
                        <FieldError>{errors.faq_items[index].question.message}</FieldError>
                      )}
                      <Input />
                    </TextField>
                  )}
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

              <Controller
                control={control}
                name={`faq_items.${index}.answer`}
                render={({field: answerField}) => (
                  <TextField
                    fullWidth
                    isInvalid={!!errors.faq_items?.[index]?.answer}
                    name={answerField.name}
                    onBlur={answerField.onBlur}
                    onChange={answerField.onChange}
                    value={answerField.value}
                  >
                    <Label>Answer</Label>
                    {errors.faq_items?.[index]?.answer && (
                      <FieldError>{errors.faq_items[index].answer.message}</FieldError>
                    )}
                    <TextArea rows={2} />
                  </TextField>
                )}
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
