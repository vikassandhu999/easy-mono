import {addDays, formatDateDisplay} from '@easy/utils';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {generatePath, useParams, useSearchParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {useNutritionDay} from '../api/nutrition-days';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Page, PageHeader, Surface} from '../ui/page';
import {DayTotals, MealRecord} from './nutrition-day';

export function NutritionHistory() {
  const {clientId = ''} = useParams();
  return (
    <History
      key={clientId}
      clientId={clientId}
    />
  );
}

function History({clientId}: {clientId: string}) {
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || undefined;
  const query = useNutritionDay(clientId, date);
  const client = useClient(clientId);
  const person = client.data?.data;
  const name = person ? person.preferred_name || person.full_name || person.email || 'Client' : 'Client';
  const day = query.data?.data[0];
  const selectedDate = day?.date ?? date ?? '';
  const openDate = (value?: string) => setParams(value ? {date: value} : {});
  return (
    <Page>
      <PageHeader
        title={`Nutrition history for ${name}`}
        description="Read daily intake and the guidance for each meal."
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
      />
      {!person ? (
        <Surface>
          {client.isPending ? (
            <p role="status">Loading client…</p>
          ) : (
            <div className="space-y-4">
              <FormError message={errorMessage(client.error, 'Could not load this client.')} />
              <Button
                onPress={() => {
                  client.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </Surface>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex items-center gap-2"
                role="group"
                aria-label="Browse nutrition dates"
              >
                <Button
                  variant="outline"
                  aria-label="Previous day"
                  isDisabled={!day}
                  onPress={() => {
                    if (day) {
                      openDate(addDays(day.date, -1).toString());
                    }
                  }}
                >
                  <ChevronLeft
                    className="size-4"
                    aria-hidden="true"
                  />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  aria-label="Next day"
                  isDisabled={!day}
                  onPress={() => {
                    if (day) {
                      openDate(addDays(day.date, 1).toString());
                    }
                  }}
                >
                  Next
                  <ChevronRight
                    className="size-4"
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  variant="ghost"
                  onPress={() => {
                    if (date) {
                      openDate();
                    } else {
                      query.refetch();
                    }
                  }}
                >
                  Today
                </Button>
              </div>
              <Button
                variant="ghost"
                aria-label="Refresh nutrition day"
                isPending={query.isFetching}
                onPress={() => {
                  query.refetch();
                }}
              >
                Refresh
              </Button>
            </div>
            <ChooseDate
              key={selectedDate}
              date={selectedDate}
              onChoose={openDate}
            />
          </div>
          {!day ? (
            <Surface>
              {query.isPending ? (
                <div
                  role="status"
                  className="animate-pulse space-y-5"
                >
                  <p>Loading nutrition day…</p>
                  <div className="h-6 w-1/2 rounded bg-muted" />
                  <div className="h-48 rounded bg-muted" />
                </div>
              ) : (
                <div className="space-y-4">
                  <FormError
                    message={
                      query.error instanceof ApiError && query.error.status === 422
                        ? 'Choose a valid date to view nutrition history.'
                        : errorMessage(query.error, 'Could not load this nutrition day.')
                    }
                  />
                  <Button
                    onPress={() => {
                      query.refetch();
                    }}
                  >
                    Try again
                  </Button>
                </div>
              )}
            </Surface>
          ) : (
            <div
              key={day.date}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">
                  <time dateTime={day.date}>{formatDateDisplay(day.date)}</time>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Client timezone: {day.applied_timezone.replaceAll('_', ' ')}
                </p>
                {query.isError && (
                  <FormError message="Could not refresh this day. Showing the previously loaded record." />
                )}
              </div>
              <DayTotals day={day} />
              {day.slots.length === 0 ? (
                <div className="space-y-2">
                  <h2 className="section-title">No meal records</h2>
                  <p className="text-sm text-muted-foreground">
                    There are no meal records or meal guidance available for this date. Choose another day to continue
                    reviewing.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  <p className="text-sm text-muted-foreground">
                    Unrecorded foods are shown for context and are not included in logged totals.
                  </p>
                  {day.slots.map((slot) => (
                    <MealRecord
                      key={slot.meal_slot}
                      slot={slot}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Page>
  );
}

function ChooseDate({date, onChoose}: {date: string; onChoose: (date: string) => void}) {
  const form = useForm<{date: string}>({defaultValues: {date}});
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((value) => onChoose(value.date))}
      className="grid grid-cols-[minmax(0,14rem)_auto] items-start justify-start gap-3"
    >
      <FormField
        control={form.control}
        name="date"
        label="Date"
        type="date"
        isRequired
      />
      <Button
        type="submit"
        variant="outline"
        className="mt-7"
      >
        View day
      </Button>
    </form>
  );
}
