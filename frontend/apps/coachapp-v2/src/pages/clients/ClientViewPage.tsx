import {Button, Card, Skeleton} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate, useParams} from 'react-router';

import {useGetClientQuery} from '@/api/clients';
import {CLIENT_STATUS_STYLES, formatDateTime, getClientName} from '@/pages/clients/clientDisplay';

export default function ClientViewPage() {
  const navigate = useNavigate();
  const {id} = useParams();

  const {data, isError, isLoading, refetch} = useGetClientQuery(id ?? '', {
    skip: !id,
  });

  if (!id) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-foreground">Invalid client route</p>
          <p className="text-sm text-muted">The requested client id is missing.</p>
          <div>
            <Button
              onPress={() => navigate('/clients')}
              size="md"
              variant="outline"
            >
              Back to Clients
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <Button
          className="gap-2"
          onPress={() => navigate('/clients')}
          size="md"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Clients</span>
        </Button>
      </div>

      {isLoading ? (
        <Card className="border border-separator bg-surface p-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </Card>
      ) : null}

      {isError ? (
        <Card className="border border-separator bg-surface p-6">
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-foreground">Could not load client</p>
            <p className="text-sm text-muted">Please try again or return to the clients list.</p>
            <div className="flex gap-2">
              <Button
                onPress={() => refetch()}
                size="md"
                variant="outline"
              >
                Retry
              </Button>
              <Button
                onPress={() => navigate('/clients')}
                size="md"
                variant="ghost"
              >
                Back
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {!isLoading && !isError && data?.data ? (
        <Card className="border border-separator bg-surface p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted">Client</p>
                <h1 className="text-2xl font-semibold text-foreground">{getClientName(data.data)}</h1>
                <p className="text-sm text-muted">{data.data.email}</p>
              </div>
              <span
                className={`w-fit rounded-full px-2 py-1 text-xs font-medium capitalize ${CLIENT_STATUS_STYLES[data.data.status.toLowerCase()] ?? 'bg-default text-muted'}`}
              >
                {data.data.status}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border border-separator bg-background p-4">
                <p className="text-xs text-muted">Phone</p>
                <p className="text-sm font-medium text-foreground">{data.data.phone || 'Not provided'}</p>
              </Card>
              <Card className="border border-separator bg-background p-4">
                <p className="text-xs text-muted">Joined</p>
                <p className="text-sm font-medium text-foreground">{formatDateTime(data.data.inserted_at)}</p>
              </Card>
              <Card className="border border-separator bg-background p-4">
                <p className="text-xs text-muted">Last Updated</p>
                <p className="text-sm font-medium text-foreground">{formatDateTime(data.data.updated_at)}</p>
              </Card>
              <Card className="border border-separator bg-background p-4">
                <p className="text-xs text-muted">Status</p>
                <p className="text-sm font-medium capitalize text-foreground">{data.data.status}</p>
              </Card>
            </div>

            <Card className="border border-separator bg-background p-4">
              <p className="text-xs text-muted">Notes</p>
              <p className="text-sm text-foreground">{data.data.notes || 'No notes yet.'}</p>
            </Card>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
