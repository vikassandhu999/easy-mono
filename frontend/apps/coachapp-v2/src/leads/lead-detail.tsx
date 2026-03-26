import {AlertDialog, Button, Chip, Label, ListBox, Select, Spinner, TextArea, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft, MessageCircle, Trash2, UserCheck, XCircle} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router-dom';
import {z} from 'zod';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {
  type LeadStatus,
  useConvertLeadMutation,
  useDeleteLeadMutation,
  useGetLeadQuery,
  useUpdateLeadMutation,
} from '@/api/leads';
import {applyFormErrors} from '@/api/shared';

type StatusConfig = {
  color: 'accent' | 'danger' | 'default' | 'success' | 'warning';
  label: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  contacted: {color: 'warning', label: 'Contacted'},
  converted: {color: 'success', label: 'Converted'},
  new: {color: 'accent', label: 'New'},
  rejected: {color: 'danger', label: 'Rejected'},
};

const STATUS_OPTIONS: {label: string; value: LeadStatus}[] = [
  {label: 'New', value: 'new'},
  {label: 'Contacted', value: 'contacted'},
  {label: 'Converted', value: 'converted'},
  {label: 'Rejected', value: 'rejected'},
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Inner component — mounts only when lead data is loaded. */
function LeadDetailContent({leadId}: {leadId: string}) {
  const navigate = useNavigate();
  const {data} = useGetLeadQuery(leadId);
  const [updateLead] = useUpdateLeadMutation();
  const [convertLead, {isLoading: isConverting}] = useConvertLeadMutation();
  const [deleteLead, {isLoading: isDeleting}] = useDeleteLeadMutation();

  const lead = data!.data;
  const status = STATUS_MAP[lead.status] ?? {color: 'default' as const, label: lead.status};
  const intakeEntries = Object.entries(lead.intake_answers ?? {});

  // Notes form — react-hook-form + zod
  const notesSchema = z.object({notes: z.string().optional()});
  type NotesValues = z.infer<typeof notesSchema>;
  const notesForm = useForm<NotesValues>({
    resolver: zodResolver(notesSchema),
    values: {notes: lead.notes ?? ''},
  });

  const handleStatusChange = async (newStatus: LeadStatus) => {
    try {
      await updateLead({body: {status: newStatus}, id: leadId}).unwrap();
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.danger('Failed to update status.');
    }
  };

  const handleSaveNotes = async (formData: NotesValues) => {
    try {
      await updateLead({body: {notes: formData.notes || null}, id: leadId}).unwrap();
      toast.success('Notes saved');
    } catch (err) {
      applyFormErrors(err, 'Failed to save notes.', notesForm.setError);
    }
  };

  const handleConvert = async () => {
    try {
      await convertLead(leadId).unwrap();
      toast.success('Lead converted to client');
    } catch {
      toast.danger('Failed to convert lead.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLead(leadId).unwrap();
      navigate(ROUTES.LEADS, {replace: true});
    } catch {
      toast.danger('Failed to delete lead.');
    }
  };

  const whatsappUrl = lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}` : null;

  return (
    <PageLayout
      description={lead.email}
      title="Lead"
    >
      {/* Top actions */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button
          onPress={() => navigate(ROUTES.LEADS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>

        <div className="flex-1" />

        {whatsappUrl && (
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-divider px-3 py-2 text-sm font-medium transition-colors hover:bg-default-100 active:bg-default-200"
            href={whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
        )}

        {lead.status !== 'converted' && (
          <Button
            isPending={isConverting}
            onPress={handleConvert}
            size="sm"
          >
            <UserCheck size={16} />
            Convert to Client
          </Button>
        )}

        {lead.status !== 'rejected' && lead.status !== 'converted' && (
          <Button
            onPress={() => handleStatusChange('rejected')}
            size="sm"
            variant="secondary"
          >
            <XCircle size={16} />
            Reject
          </Button>
        )}

        <AlertDialog>
          <Button
            size="sm"
            variant="danger"
          >
            <Trash2 size={16} />
            Delete
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Delete lead?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    This will permanently delete <strong>{lead.name}</strong>&apos;s lead. This action cannot be undone.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
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
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>

      <div className="max-w-lg">
        {/* Contact info */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold">{lead.name}</h2>
          <div className="mt-2 flex flex-col gap-1 text-sm text-foreground-500">
            <p>{lead.email}</p>
            <p>{lead.phone}</p>
            {lead.instagram_handle && <p>{lead.instagram_handle}</p>}
          </div>
          <p className="mt-2 text-xs text-foreground-400">Submitted {formatDate(lead.inserted_at)}</p>
          {lead.source && <p className="text-xs text-foreground-400">Source: {lead.source}</p>}
        </section>

        {/* Status */}
        <section className="mb-6 flex items-center gap-3">
          <Chip
            color={status.color}
            size="sm"
            variant="soft"
          >
            {status.label}
          </Chip>

          <Select
            className="w-40"
            onSelectionChange={(key) => {
              if (key) handleStatusChange(key as LeadStatus);
            }}
            placeholder="Change status"
            selectedKey={lead.status}
          >
            <Label className="sr-only">Status</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {STATUS_OPTIONS.map((opt) => (
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
        </section>

        {/* Offer */}
        {lead.offer && (
          <section className="mb-6 rounded-xl border border-divider bg-content1 p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground-400">Offer</h3>
            <p className="text-sm font-medium">{lead.offer.name}</p>
            {(lead.offer.duration_text || lead.offer.price_display) && (
              <p className="text-xs text-foreground-500">
                {[lead.offer.duration_text, lead.offer.price_display].filter(Boolean).join(' · ')}
              </p>
            )}
          </section>
        )}

        {/* Intake answers */}
        {intakeEntries.length > 0 && (
          <section className="mb-6 rounded-xl border border-divider bg-content1 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-400">Intake Answers</h3>
            <div className="flex flex-col gap-2">
              {intakeEntries.map(([key, value]) => (
                <div
                  className="flex items-baseline justify-between gap-4"
                  key={key}
                >
                  <span className="text-sm text-foreground-500">{key}</span>
                  <span className="text-right text-sm font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Converted client link */}
        {lead.client && (
          <section className="mb-6 rounded-xl border border-success/20 bg-success/5 p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-success">Converted Client</h3>
            <p className="text-sm font-medium">{lead.client.first_name ?? lead.client.email}</p>
            <Button
              className="mt-2"
              onPress={() => navigate(`/clients/${lead.client!.id}`)}
              size="sm"
              variant="ghost"
            >
              View Client
            </Button>
          </section>
        )}

        {/* Notes */}
        <form
          className="mb-6"
          onSubmit={notesForm.handleSubmit(handleSaveNotes)}
        >
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Notes (private)</h3>
          <TextArea
            placeholder="Add notes about this lead..."
            rows={3}
            {...notesForm.register('notes')}
          />
          {notesForm.formState.errors.root && (
            <p className="mt-1 text-xs text-danger">{notesForm.formState.errors.root.message}</p>
          )}
          <Button
            className="mt-2"
            size="sm"
            type="submit"
            variant="ghost"
          >
            Save notes
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}

export default function LeadDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading: isFetching} = useGetLeadQuery(id!);

  if (isFetching || !data) {
    return (
      <PageLayout title="Lead">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Lead">
        <div className="mb-4">
          <Button
            onPress={() => navigate(ROUTES.LEADS)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load lead.
        </div>
      </PageLayout>
    );
  }

  return <LeadDetailContent leadId={id!} />;
}
