/**
 * Client workspace "Subscription" tab. Membership term with progress,
 * quick-extend for the end date, and status lifecycle actions. Term dates are
 * the Client's subscription_started_on/ends_on fields — there is no per-client
 * billing, so the design's price/next-billing cells are omitted.
 */
import {formatIsoDateOnly, parseIsoDateToDate} from '@easy/utils';
import {Typography, toast} from '@heroui/react';
import {CalendarPlus, ChevronDown, CreditCard, Pause, Play} from 'lucide-react';

import DateInput from '@/@components/date-input';
import {type Client, useUpdateClientMutation} from '@/api/clients';
import {getApiErrorMessage} from '@/api/shared';
import AssignSurface from '@/clients/components/assign-surface';

const DAY_MS = 86_400_000;

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addMonths(iso: null | string, months: number): string {
  const date = iso ? parseIsoDateToDate(iso) : new Date();
  date.setMonth(date.getMonth() + months);
  return toIsoDate(date);
}

function termProgress(client: Client) {
  if (!client.subscription_started_on || !client.subscription_ends_on) {
    return null;
  }
  const start = parseIsoDateToDate(client.subscription_started_on).getTime();
  const end = parseIsoDateToDate(client.subscription_ends_on).getTime();
  const now = Date.now();
  const totalDays = Math.max(1, Math.round((end - start) / DAY_MS));
  const elapsed = Math.min(totalDays, Math.max(0, Math.round((now - start) / DAY_MS)));
  const remaining = Math.max(0, Math.round((end - now) / DAY_MS));
  return {
    elapsedLabel: `${elapsed} of ${totalDays} days`,
    pct: Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100))),
    remainingLabel: `${remaining} days left`,
  };
}

function statusPill(client: Client) {
  if (client.status === 'active') {
    return {className: 'bg-success-soft text-success-soft-foreground', label: 'Active'};
  }
  if (client.status === 'pending') {
    return {className: 'bg-surface-secondary text-muted', label: 'Pending'};
  }
  return {className: 'bg-warning-soft text-warning-soft-foreground', label: 'Inactive'};
}

function DateCell({label, value}: {label: string; value: null | string}) {
  return (
    <div className="rounded-[16px] border-[1.5px] border-separator bg-surface p-4">
      <Typography
        className="text-[11px] leading-[normal]"
        color="muted"
        weight="semibold"
      >
        {label}
      </Typography>
      <div className="mt-1.5 text-sm font-bold">{value ? formatIsoDateOnly(value) : '—'}</div>
    </div>
  );
}

export default function ClientSubscription({client}: {client: Client}) {
  const [updateClient, {isLoading: isSaving}] = useUpdateClientMutation();
  const progress = termProgress(client);
  const pill = statusPill(client);

  const setEndDate = async (iso: null | string, close?: () => void) => {
    if (!iso) {
      return;
    }
    try {
      await updateClient({body: {subscription_ends_on: iso}, id: client.id}).unwrap();
      toast.success(`Subscription now ends ${formatIsoDateOnly(iso)}`);
      close?.();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Subscription wasn't updated. Try again."));
    }
  };

  const toggleStatus = async () => {
    const nextStatus = client.status === 'active' ? 'inactive' : 'active';
    try {
      await updateClient({body: {status: nextStatus}, id: client.id}).unwrap();
      toast.success(nextStatus === 'active' ? 'Client reactivated' : 'Client deactivated');
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Client status wasn't changed. Try again."));
    }
  };

  return (
    <section>
      <div className="mb-5 hidden lg:block">
        <h2 className="font-grotesk text-xl font-bold">Subscription</h2>
        <Typography
          className="mt-1"
          color="muted"
          type="body-sm"
        >
          Membership term &amp; lifecycle
        </Typography>
      </div>

      <div className="rounded-[16px] border-[1.5px] border-separator bg-surface p-[18px] lg:rounded-[18px] lg:p-[22px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-[13px]">
            <span className="grid size-[46px] shrink-0 place-items-center rounded-[13px] bg-accent-soft text-accent">
              <CreditCard size={21} />
            </span>
            <div className="min-w-0">
              <Typography
                className="text-[15.5px] leading-[normal]"
                truncate
                weight="bold"
              >
                Membership
              </Typography>
              <Typography
                className="mt-[1px] text-[12.5px] leading-[normal]"
                color="muted"
                truncate
              >
                {client.subscription_started_on
                  ? `Member since ${formatIsoDateOnly(client.subscription_started_on)}`
                  : 'No term set'}
              </Typography>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-[5px] text-[11.5px] leading-[normal] font-bold ${pill.className}`}
          >
            {pill.label}
          </span>
        </div>

        {progress ? (
          <div className="mt-[18px]">
            <div className="mb-2 flex items-center justify-between">
              <Typography
                className="text-[12.5px] leading-[normal]"
                weight="bold"
              >
                Current term
              </Typography>
              <Typography
                className="text-xs leading-[normal]"
                color="muted"
              >
                {progress.remainingLabel}
              </Typography>
            </div>
            <div className="h-[9px] overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-accent"
                style={{width: `${progress.pct}%`}}
              />
            </div>
            <Typography
              className="mt-2 text-[11.5px] leading-[normal]"
              color="muted"
            >
              {progress.elapsedLabel} elapsed
            </Typography>
          </div>
        ) : (
          <Typography
            className="mt-[18px]"
            color="muted"
            type="body-sm"
          >
            Set an end date below to track the membership term. The start date lives on the client edit form.
          </Typography>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <DateCell
          label="Start date"
          value={client.subscription_started_on}
        />
        <DateCell
          label="End date"
          value={client.subscription_ends_on}
        />
      </div>

      <div className="mt-4">
        <AssignSurface
          label={
            <span className="flex w-full items-center justify-between gap-3">
              <span className="flex items-center gap-[11px]">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-secondary text-foreground">
                  <CalendarPlus size={17} />
                </span>
                <span className="text-left">
                  <span className="block text-[13.5px] leading-[normal] font-bold text-foreground">
                    Extend subscription
                  </span>
                  <span className="block text-[11.5px] leading-[normal] font-normal text-muted">
                    Push the end date forward
                  </span>
                </span>
              </span>
              <ChevronDown
                className="shrink-0 text-muted"
                size={17}
              />
            </span>
          }
          popoverClassName="w-88 p-4"
          triggerClassName="h-auto min-h-11 w-full rounded-[16px] border-[1.5px] border-separator bg-surface px-[18px] py-[15px] hover:border-accent"
        >
          {(close) => (
            <div>
              <Typography
                className="mb-[10px] text-[11px] leading-[normal] tracking-[0.05em] uppercase"
                color="muted"
                weight="bold"
              >
                Quick extend
              </Typography>
              <div className="mb-[14px] flex gap-2">
                {[1, 3, 6].map((months) => (
                  <button
                    className="min-h-11 flex-1 rounded-[11px] border-[1.5px] border-separator text-[13px] font-bold transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                    disabled={isSaving}
                    key={months}
                    onClick={() => setEndDate(addMonths(client.subscription_ends_on, months), close)}
                    type="button"
                  >
                    +{months} month{months > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              <Typography
                className="mb-2 text-[11px] leading-[normal] tracking-[0.05em] uppercase"
                color="muted"
                weight="bold"
              >
                Or set a date
              </Typography>
              <DateInput
                ariaLabel="Subscription end date"
                isDisabled={isSaving}
                onChange={(iso) => setEndDate(iso, close)}
                value={client.subscription_ends_on}
              />
            </div>
          )}
        </AssignSurface>
      </div>

      {client.status !== 'pending' ? (
        <>
          <Typography
            className="mt-[22px] mb-[10px] text-[11px] leading-[normal] tracking-[0.06em] uppercase"
            color="muted"
            weight="bold"
          >
            Manage
          </Typography>
          <button
            className="flex min-h-11 w-full items-center gap-[11px] rounded-[14px] border-[1.5px] border-separator bg-surface px-4 py-[14px] text-left transition-colors hover:border-warning-soft-foreground disabled:opacity-60"
            disabled={isSaving}
            onClick={toggleStatus}
            type="button"
          >
            <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-warning-soft text-warning-soft-foreground">
              {client.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
            </span>
            <span className="flex-1">
              <span className="block text-[13.5px] leading-[normal] font-bold">
                {client.status === 'active' ? 'Deactivate client' : 'Reactivate client'}
              </span>
              <span className="block text-[11.5px] leading-[normal] text-muted">
                {client.status === 'active' ? 'Pauses coaching without deleting anything' : 'Resume coaching'}
              </span>
            </span>
          </button>
        </>
      ) : null}
    </section>
  );
}
