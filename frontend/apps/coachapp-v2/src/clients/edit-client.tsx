import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  Description,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextArea,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {parseDate} from '@internationalized/date';
import {ArrowLeft, ChevronRight} from 'lucide-react';
import {type ReactNode, useState} from 'react';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {z} from 'zod';

import PageLayout from '@/@components/page-layout';
import {useGoBack} from '@/@hooks/use-go-back';
import {type PaymentStatus, useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';

// ── Schema ───────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  first_name: z.string().optional(),
  instagram_handle: z.string().optional(),
  last_name: z.string().optional(),
  notes: z.string().optional(),
  payment_amount: z.coerce.number().positive('Must be positive').optional().or(z.literal('')),
  payment_currency: z.string().optional(),
  payment_notes: z.string().optional(),
  payment_status: z.string().optional(),
  phone: z.string().optional(),
  program_end: z.string().optional(),
  program_name: z.string().optional(),
  program_start: z.string().optional(),
  status_override: z.string().optional(),
});

type EditClientFormValues = z.infer<typeof schema>;

const PAYMENT_STATUS_OPTIONS = [
  {label: 'Not set', value: ''},
  {label: 'Pending', value: 'pending'},
  {label: 'Partial', value: 'partial'},
  {label: 'Paid', value: 'paid'},
  {label: 'Free', value: 'free'},
];

const STATUS_OVERRIDE_OPTIONS = [
  {label: 'Automatic', value: ''},
  {label: 'Active', value: 'active'},
  {label: 'Inactive', value: 'inactive'},
  {label: 'Pending', value: 'pending'},
  {label: 'Expired', value: 'expired'},
  {label: 'Archived', value: 'archived'},
];

// ── Collapsible section ──────────────────────────────────────

function FormSection({
  children,
  defaultOpen = false,
  subtitle,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  subtitle?: string;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-divider">
      <button
        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-content2 active:bg-content2"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          {!open && subtitle ? <p className="mt-0.5 truncate text-xs text-foreground-500">{subtitle}</p> : null}
        </div>
        <ChevronRight
          className={`size-4 shrink-0 text-foreground-400 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open ? <div className="flex flex-col gap-4 border-t border-divider px-4 py-4">{children}</div> : null}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────

export default function EditClient() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(`/clients/${id}`);
  const [searchParams] = useSearchParams();
  const isRenew = searchParams.get('renew') === 'true';

  const {data, isLoading: isFetching} = useGetClientQuery(id!);
  const [updateClient, {isLoading: isUpdating}] = useUpdateClientMutation();
  const client = data?.data;
  const backPath = `/clients/${id}`;

  const {
    control,
    formState: {errors},
    handleSubmit,
    register,
    setError,
  } = useForm<EditClientFormValues>({
    resolver: zodResolver(schema),
    values: client ? getFormValues(client, isRenew) : undefined,
  });

  // Watch values for section subtitles
  const watched = useWatch({control});

  if (isFetching || !client) {
    return (
      <PageLayout title="Edit Client">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  const onSubmit = async (formData: EditClientFormValues) => {
    try {
      await updateClient({
        body: {
          first_name: formData.first_name || undefined,
          instagram_handle: formData.instagram_handle || null,
          last_name: formData.last_name || undefined,
          notes: formData.notes || null,
          payment_amount: typeof formData.payment_amount === 'number' ? formData.payment_amount : null,
          payment_currency: formData.payment_currency || null,
          payment_notes: formData.payment_notes || null,
          payment_status: (formData.payment_status || null) as null | PaymentStatus,
          phone: formData.phone || null,
          program_end: formData.program_end || null,
          program_name: formData.program_name || null,
          program_start: formData.program_start || null,
          status_override: formData.status_override || null,
        },
        id: id!,
      }).unwrap();
      navigate(backPath);
    } catch (err) {
      applyFormErrors(err, 'Failed to update client.', setError);
    }
  };

  // ── Subtitle summaries ──────────────────────────────────
  const personalParts = [
    [watched.first_name, watched.last_name].filter(Boolean).join(' '),
    watched.phone,
    watched.email,
  ].filter(Boolean);
  const personalSubtitle = personalParts.join(' · ') || 'No info set';

  const programParts = [
    watched.program_name,
    watched.program_start && watched.program_end ? `${watched.program_start} → ${watched.program_end}` : '',
  ].filter(Boolean);
  const programSubtitle = programParts.join(' · ') || 'Not set';

  const paymentLabel = PAYMENT_STATUS_OPTIONS.find((o) => o.value === watched.payment_status)?.label;
  const paymentParts = [
    watched.payment_amount ? `${watched.payment_amount} ${watched.payment_currency || ''}`.trim() : '',
    paymentLabel && watched.payment_status ? paymentLabel : '',
  ].filter(Boolean);
  const paymentSubtitle = paymentParts.join(' · ') || 'Not set';

  const notesSubtitle = watched.notes
    ? watched.notes.length > 60
      ? `${watched.notes.slice(0, 60)}...`
      : watched.notes
    : 'No notes';

  const statusLabel = STATUS_OVERRIDE_OPTIONS.find((o) => o.value === watched.status_override)?.label;
  const statusSubtitle = watched.status_override ? `Override: ${statusLabel}` : `Automatic (${client.status})`;

  return (
    <PageLayout title="Edit Client">
      <div className="mb-4">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <form
        className="flex max-w-lg flex-col gap-3"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* ── Personal Info ──────────────────────────────── */}
        <FormSection
          defaultOpen
          subtitle={personalSubtitle}
          title="Personal Info"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                placeholder="Vikas"
                {...register('first_name')}
              />
              {errors.first_name ? <p className="text-xs text-danger">{errors.first_name.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                placeholder="Sandhu"
                {...register('last_name')}
              />
              {errors.last_name ? <p className="text-xs text-danger">{errors.last_name.message}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="vikas@email.com"
                type="email"
                {...register('email')}
              />
              {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                type="tel"
                {...register('phone')}
              />
              {errors.phone ? <p className="text-xs text-danger">{errors.phone.message}</p> : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instagram_handle">Instagram</Label>
            <Input
              id="instagram_handle"
              placeholder="@vikas_fitness"
              {...register('instagram_handle')}
            />
          </div>
        </FormSection>

        {/* ── Program ────────────────────────────────────── */}
        <FormSection
          defaultOpen={isRenew}
          subtitle={programSubtitle}
          title="Program"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="program_name">Program name</Label>
            <Input
              id="program_name"
              placeholder="Fat Loss 12 Weeks"
              {...register('program_name')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Controller
              control={control}
              name="program_start"
              render={({field}) => (
                <DatePicker
                  onChange={(val) => field.onChange(val ? val.toString() : '')}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  value={field.value ? (parseDate(field.value) as any) : null}
                >
                  <Label>Start date</Label>
                  <DateField.Group fullWidth>
                    <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                    <DateField.Suffix>
                      <DatePicker.Trigger>
                        <DatePicker.TriggerIndicator />
                      </DatePicker.Trigger>
                    </DateField.Suffix>
                  </DateField.Group>
                  <DatePicker.Popover>
                    <Calendar aria-label="Start date">
                      <Calendar.Header>
                        <Calendar.YearPickerTrigger>
                          <Calendar.YearPickerTriggerHeading />
                          <Calendar.YearPickerTriggerIndicator />
                        </Calendar.YearPickerTrigger>
                        <Calendar.NavButton slot="previous" />
                        <Calendar.NavButton slot="next" />
                      </Calendar.Header>
                      <Calendar.Grid>
                        <Calendar.GridHeader>
                          {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                        </Calendar.GridHeader>
                        <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                      </Calendar.Grid>
                    </Calendar>
                  </DatePicker.Popover>
                </DatePicker>
              )}
            />
            <Controller
              control={control}
              name="program_end"
              render={({field}) => (
                <DatePicker
                  onChange={(val) => field.onChange(val ? val.toString() : '')}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  value={field.value ? (parseDate(field.value) as any) : null}
                >
                  <Label>End date</Label>
                  <DateField.Group fullWidth>
                    <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                    <DateField.Suffix>
                      <DatePicker.Trigger>
                        <DatePicker.TriggerIndicator />
                      </DatePicker.Trigger>
                    </DateField.Suffix>
                  </DateField.Group>
                  <DatePicker.Popover>
                    <Calendar aria-label="End date">
                      <Calendar.Header>
                        <Calendar.YearPickerTrigger>
                          <Calendar.YearPickerTriggerHeading />
                          <Calendar.YearPickerTriggerIndicator />
                        </Calendar.YearPickerTrigger>
                        <Calendar.NavButton slot="previous" />
                        <Calendar.NavButton slot="next" />
                      </Calendar.Header>
                      <Calendar.Grid>
                        <Calendar.GridHeader>
                          {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                        </Calendar.GridHeader>
                        <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                      </Calendar.Grid>
                    </Calendar>
                  </DatePicker.Popover>
                </DatePicker>
              )}
            />
          </div>
        </FormSection>

        {/* ── Payment ────────────────────────────────────── */}
        <FormSection
          subtitle={paymentSubtitle}
          title="Payment"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment_amount">Amount</Label>
              <Input
                id="payment_amount"
                placeholder="4999"
                type="number"
                {...register('payment_amount')}
              />
              {errors.payment_amount ? <p className="text-xs text-danger">{errors.payment_amount.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment_currency">Currency</Label>
              <Input
                id="payment_currency"
                placeholder="INR"
                {...register('payment_currency')}
              />
            </div>
          </div>

          <Controller
            control={control}
            name="payment_status"
            render={({field}) => (
              <Select
                onSelectionChange={(key) => field.onChange(key)}
                selectedKey={field.value || null}
              >
                <Label>Payment status</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {PAYMENT_STATUS_OPTIONS.map((opt) => (
                      <ListBox.Item
                        id={opt.value}
                        key={opt.value}
                        textValue={opt.label}
                      >
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment_notes">Payment notes</Label>
            <Input
              id="payment_notes"
              placeholder="UPI received Mar 1"
              {...register('payment_notes')}
            />
          </div>
        </FormSection>

        {/* ── Notes ──────────────────────────────────────── */}
        <FormSection
          subtitle={notesSubtitle}
          title="Notes"
        >
          <TextArea
            id="notes"
            placeholder="Any notes about this client..."
            rows={3}
            {...register('notes')}
          />
        </FormSection>

        {/* ── Status Override ────────────────────────────── */}
        <FormSection
          subtitle={statusSubtitle}
          title="Status Override"
        >
          <Controller
            control={control}
            name="status_override"
            render={({field}) => (
              <Select
                onSelectionChange={(key) => field.onChange(key)}
                selectedKey={field.value || null}
              >
                <Label>Override status</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {STATUS_OVERRIDE_OPTIONS.map((opt) => (
                      <ListBox.Item
                        id={opt.value}
                        key={opt.value}
                        textValue={opt.label}
                      >
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
          <Description>
            Currently computed as: <strong>{client.status}</strong>. Set a manual override only if needed.
          </Description>
        </FormSection>

        {/* ── Form errors + actions ──────────────────────── */}
        {errors.root ? <p className="text-sm text-danger">{errors.root.message}</p> : null}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            onPress={() => navigate(backPath)}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            isPending={isUpdating}
            type="submit"
          >
            {isUpdating ? (
              <>
                <Spinner
                  color="current"
                  size="sm"
                />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function getFormValues(
  client: NonNullable<ReturnType<typeof useGetClientQuery>['data']>['data'],
  isRenew: boolean,
): EditClientFormValues {
  if (!client) return {} as EditClientFormValues;

  // Renew mode: shift dates forward, reset payment to pending
  if (isRenew && client.program_end) {
    const oldEnd = new Date(client.program_end);
    const today = new Date();
    const newStart = oldEnd > today ? oldEnd : today;

    // Compute duration from old program (fallback 30 days)
    let durationDays = 30;
    if (client.program_start && client.program_end) {
      const start = new Date(client.program_start).getTime();
      const end = new Date(client.program_end).getTime();
      durationDays = Math.round((end - start) / 86400000);
      if (durationDays < 1) durationDays = 30;
    }

    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + durationDays);

    return {
      email: client.email ?? '',
      first_name: client.first_name ?? '',
      instagram_handle: client.instagram_handle ?? '',
      last_name: client.last_name ?? '',
      notes: client.notes ?? '',
      payment_amount: client.payment_amount ?? '',
      payment_currency: client.payment_currency ?? '',
      payment_notes: '',
      payment_status: 'pending',
      phone: client.phone ?? '',
      program_end: toDateString(newEnd),
      program_name: client.program_name ?? '',
      program_start: toDateString(newStart),
      status_override: client.status_override ?? '',
    };
  }

  return {
    email: client.email ?? '',
    first_name: client.first_name ?? '',
    instagram_handle: client.instagram_handle ?? '',
    last_name: client.last_name ?? '',
    notes: client.notes ?? '',
    payment_amount: client.payment_amount ?? '',
    payment_currency: client.payment_currency ?? '',
    payment_notes: client.payment_notes ?? '',
    payment_status: client.payment_status ?? '',
    phone: client.phone ?? '',
    program_end: client.program_end ?? '',
    program_name: client.program_name ?? '',
    program_start: client.program_start ?? '',
    status_override: client.status_override ?? '',
  };
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}
