/**
 * Client profile fields — business-scoped settings screen to define the intake
 * questionnaire. Each field belongs to a section (general/nutrition/training/
 * lifestyle) and has a type; the per-client profile screen renders these as
 * inputs. CRUD via the generated profile-field endpoints.
 */
import {AlertDialog, Button, Form, ListBox, Spinner, Typography, toast, useOverlayState} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft, Pencil, Plus, Trash2} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';
import {FormSelectField, FormSwitchField, FormTextAreaField, FormTextField} from '@/@components/form-fields';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {
  type ClientProfileField,
  FIELD_TYPE_LABELS,
  isFilterableType,
  PROFILE_SECTIONS,
  type ProfileFieldType,
  type ProfileSection,
  useCreateProfileFieldMutation,
  useDeleteProfileFieldMutation,
  useListProfileFieldsQuery,
  useUpdateProfileFieldMutation,
} from '@/api/client-profile';
import {applyFormErrors} from '@/api/shared';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import SectionHeading from '@/settings/components/section-heading';

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as ProfileFieldType[];

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'field'
  );
}

/** Derive a stable, business-unique key from the label. Keys never change after create. */
function uniqueKey(label: string, taken: Set<string>): string {
  const base = slugify(label);
  if (!taken.has(base)) {
    return base;
  }
  let i = 2;
  while (taken.has(`${base}_${i}`)) {
    i += 1;
  }
  return `${base}_${i}`;
}

const fieldFormSchema = z
  .object({
    field_type: z.enum(['text', 'number', 'boolean', 'date', 'select', 'multi_select']),
    filterable: z.boolean().optional(),
    label: z.string().min(1, 'Label is required'),
    optionsText: z.string().optional(),
    section: z.enum(['general', 'nutrition', 'training', 'lifestyle']),
  })
  .refine(
    (data) =>
      (data.field_type !== 'select' && data.field_type !== 'multi_select') ||
      (data.optionsText ?? '').split('\n').some((line) => line.trim() !== ''),
    {message: 'Add at least one option (one per line)', path: ['optionsText']},
  );

type FieldFormValues = z.infer<typeof fieldFormSchema>;

type EditTarget = {field: ClientProfileField; mode: 'edit'} | {mode: 'create'; section: ProfileSection};

function parseOptions(text: string | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function FieldForm({
  target,
  existingKeys,
  onDone,
}: {
  target: EditTarget;
  existingKeys: Set<string>;
  onDone: () => void;
}) {
  const [createField, {isLoading: isCreating}] = useCreateProfileFieldMutation();
  const [updateField, {isLoading: isUpdating}] = useUpdateProfileFieldMutation();
  const isSubmitting = isCreating || isUpdating;

  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues:
      target.mode === 'edit'
        ? {
            field_type: target.field.field_type,
            filterable: target.field.filterable,
            label: target.field.label,
            optionsText: target.field.options.join('\n'),
            section: target.field.section,
          }
        : {field_type: 'text', filterable: false, label: '', optionsText: '', section: target.section},
  });

  const fieldType = form.watch('field_type');
  const showOptions = fieldType === 'select' || fieldType === 'multi_select';
  const filterableAllowed = isFilterableType(fieldType);

  const onSubmit = async (values: FieldFormValues) => {
    const options = showOptions ? parseOptions(values.optionsText) : [];
    const filterable = filterableAllowed ? Boolean(values.filterable) : false;

    try {
      if (target.mode === 'edit') {
        await updateField({
          id: target.field.id,
          clientProfileFieldUpdateRequest: {
            field_type: values.field_type,
            filterable,
            label: values.label,
            options,
            section: values.section,
          },
        }).unwrap();
        toast.success('Field updated');
      } else {
        await createField({
          clientProfileFieldRequest: {
            field_type: values.field_type,
            filterable,
            key: uniqueKey(values.label, existingKeys),
            label: values.label,
            options,
            section: values.section,
          },
        }).unwrap();
        toast.success('Field added');
      }
      onDone();
    } catch (err) {
      applyFormErrors(err, "Couldn't save the field. Check the details and try again.", form.setError);
    }
  };

  return (
    <Form
      className="gap-4 pb-2"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FormTextField
        control={form.control}
        fullWidth
        label="Label"
        name="label"
      />
      <FormSelectField
        control={form.control}
        label="Section"
        name="section"
      >
        {PROFILE_SECTIONS.map((s) => (
          <ListBox.Item
            id={s.key}
            key={s.key}
            textValue={s.label}
          >
            {s.label}
            <ListBox.ItemIndicator />
          </ListBox.Item>
        ))}
      </FormSelectField>
      <FormSelectField
        control={form.control}
        label="Type"
        name="field_type"
      >
        {FIELD_TYPES.map((t) => (
          <ListBox.Item
            id={t}
            key={t}
            textValue={FIELD_TYPE_LABELS[t]}
          >
            {FIELD_TYPE_LABELS[t]}
            <ListBox.ItemIndicator />
          </ListBox.Item>
        ))}
      </FormSelectField>
      {showOptions ? (
        <FormTextAreaField
          control={form.control}
          description="One option per line"
          fullWidth
          label="Options"
          name="optionsText"
          textAreaProps={{rows: 4}}
        />
      ) : null}
      {filterableAllowed ? (
        <FormSwitchField
          control={form.control}
          description="Let coaches filter the client list by this field"
          label="Filterable"
          name="filterable"
        />
      ) : null}

      {form.formState.errors.root ? (
        <Typography
          className="text-danger"
          type="body-sm"
        >
          {form.formState.errors.root.message}
        </Typography>
      ) : null}

      <div className="mt-2 flex gap-3">
        <Button
          isPending={isSubmitting}
          type="submit"
        >
          {target.mode === 'edit' ? 'Save field' : 'Add field'}
        </Button>
        <Button
          onPress={onDone}
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </Form>
  );
}

function FieldRow({field, onEdit, onDelete}: {field: ClientProfileField; onEdit: () => void; onDelete: () => void}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Typography
          truncate
          type="body-sm"
          weight="medium"
        >
          {field.label}
        </Typography>
        <Typography
          color="muted"
          type="body-xs"
        >
          {FIELD_TYPE_LABELS[field.field_type]}
          {field.filterable ? ' · Filterable' : ''}
        </Typography>
      </div>
      <Button
        aria-label={`Edit ${field.label}`}
        isIconOnly
        onPress={onEdit}
        size="sm"
        variant="ghost"
      >
        <Pencil size={16} />
      </Button>
      <Button
        aria-label={`Delete ${field.label}`}
        isIconOnly
        onPress={onDelete}
        size="sm"
        variant="ghost"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

export default function ProfileFields() {
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useListProfileFieldsQuery();
  const [deleteField, {isLoading: isDeleting}] = useDeleteProfileFieldMutation();

  const [target, setTarget] = useState<EditTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClientProfileField | null>(null);
  const deleteConfirm = useOverlayState();

  const fields = data?.data ?? [];
  const existingKeys = new Set(fields.map((f) => f.key));

  const askDelete = (field: ClientProfileField) => {
    setPendingDelete(field);
    deleteConfirm.open();
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    try {
      await deleteField({id: pendingDelete.id}).unwrap();
      deleteConfirm.close();
      setPendingDelete(null);
    } catch {
      deleteConfirm.close();
      toast.danger("Couldn't delete the field");
    }
  };

  const header = (
    <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
      <Page.TitleGroup>
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            onPress={() => navigate(ROUTES.SETTINGS)}
            size="md"
            variant="ghost"
          >
            <ArrowLeft size={20} />
          </Button>
          <Page.Title>Client profile fields</Page.Title>
        </div>
        <Page.Description>Define the intake questions shown on each client's profile.</Page.Description>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        {header}
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Typography
              color="muted"
              type="body-sm"
            >
              Couldn't load profile fields. Check your connection and try again.
            </Typography>
            <Button
              onPress={() => refetch()}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      {header}
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-2xl space-y-6">
          {PROFILE_SECTIONS.map((section) => {
            const sectionFields = fields.filter((f) => f.section === section.key);
            return (
              <section key={section.key}>
                <div className="mb-3 flex items-center justify-between">
                  <SectionHeading title={section.label} />
                  <Button
                    onPress={() => setTarget({mode: 'create', section: section.key})}
                    size="sm"
                    variant="ghost"
                  >
                    <Plus size={16} />
                    Add field
                  </Button>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-surface divide-y divide-border">
                  {sectionFields.length === 0 ? (
                    <Typography
                      className="px-4 py-3"
                      color="muted"
                      type="body-sm"
                    >
                      No fields yet.
                    </Typography>
                  ) : (
                    sectionFields.map((field) => (
                      <FieldRow
                        field={field}
                        key={field.id}
                        onDelete={() => askDelete(field)}
                        onEdit={() => setTarget({field, mode: 'edit'})}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </Page.Content>

      <KeyboardSheet
        onClose={() => setTarget(null)}
        open={target !== null}
        title={target?.mode === 'edit' ? 'Edit field' : 'Add field'}
      >
        {target ? (
          <FieldForm
            existingKeys={existingKeys}
            key={target.mode === 'edit' ? target.field.id : `new-${target.section}`}
            onDone={() => setTarget(null)}
            target={target}
          />
        ) : null}
      </KeyboardSheet>

      <AlertDialog.Backdrop
        isDismissable={!isDeleting}
        isOpen={deleteConfirm.isOpen}
        onOpenChange={deleteConfirm.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete field?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>
                This removes <strong>{pendingDelete?.label}</strong> from new profiles. Existing answers stay stored.
              </Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isDeleting}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                isPending={isDeleting}
                onPress={handleDelete}
                variant="danger"
              >
                {isDeleting ? 'Deleting' : 'Delete'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Page>
  );
}
