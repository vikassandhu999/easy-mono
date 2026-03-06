import {Button, Card, Skeleton} from '@heroui/react';
import {useNavigate, useParams, useSearch} from '@tanstack/react-router';
import {ArrowLeft} from 'lucide-react';
import {useCallback, useState} from 'react';

import {useGetClientQuery} from '@/entities/clients/api/clients';
import {useListNutritionPlansQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import {useListTrainingPlansQuery} from '@/entities/trainingPlans/api/trainingPlans';
import {getClientName} from '@/features/clients/clientDisplay';
import ClientNutritionTab from '@/features/clients/ClientNutritionTab';
import ClientOverviewTab from '@/features/clients/ClientOverviewTab';
import ClientTrainingTab from '@/features/clients/ClientTrainingTab';

import AssignTemplatePicker from './AssignTemplatePicker';
import EditClientModal from './EditClientModal';

const TABS = ['overview', 'training', 'nutrition'] as const;
type TabKey = (typeof TABS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  nutrition: 'Nutrition',
  overview: 'Overview',
  training: 'Training',
};

export default function ClientViewPage() {
  const navigate = useNavigate();
  const {id} = useParams({strict: false});
  const search = useSearch({strict: false});

  const activeTab = ((search as Record<string, unknown>).tab as TabKey) || 'overview';
  const setActiveTab = useCallback((tab: TabKey) => navigate({search: {tab}, replace: true}), [navigate]);

  const {data: clientData, isError, isLoading: clientLoading} = useGetClientQuery(id ?? '', {skip: !id});
  const {data: trainingData, isLoading: trainingLoading} = useListTrainingPlansQuery({client_id: id}, {skip: !id});
  const {data: nutritionData, isLoading: nutritionLoading} = useListNutritionPlansQuery({client_id: id}, {skip: !id});

  const [assignType, setAssignType] = useState<'nutrition' | 'training' | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const client = clientData?.data;
  const trainingPlans = trainingData?.data ?? [];
  const nutritionPlans = nutritionData?.data ?? [];

  if (!id) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-foreground">Invalid client route</p>
          <p className="text-sm text-muted">The requested client id is missing.</p>
          <div>
            <Button
              onPress={() => navigate({to: '/clients'})}
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
      <div className="flex items-center justify-between">
        <Button
          className="gap-2"
          onPress={() => navigate({to: '/clients'})}
          size="md"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Clients</span>
        </Button>
        {!clientLoading && client ? (
          <h1 className="text-xl font-semibold text-foreground">{getClientName(client)}</h1>
        ) : null}
      </div>

      {clientLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <Card className="border border-separator bg-surface p-6">
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-foreground">Could not load client</p>
            <p className="text-sm text-muted">Please try again or return to the clients list.</p>
            <div className="flex gap-2">
              <Button
                onPress={() => navigate({to: '/clients'})}
                size="md"
                variant="outline"
              >
                Back to Clients
              </Button>
            </div>
          </div>
        </Card>
      ) : client ? (
        <>
          <div className="flex gap-1 border-b border-separator">
            {TABS.map((tab) => (
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab ? 'border-b-2 border-accent text-foreground' : 'text-muted hover:text-foreground'
                }`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <ClientOverviewTab
              client={client}
              nutritionPlans={nutritionPlans}
              onAssignNutrition={() => setAssignType('nutrition')}
              onAssignTraining={() => setAssignType('training')}
              onEditClient={() => setEditOpen(true)}
              trainingPlans={trainingPlans}
            />
          ) : activeTab === 'training' ? (
            <ClientTrainingTab
              isLoading={trainingLoading}
              onAssign={() => setAssignType('training')}
              plans={trainingPlans}
            />
          ) : (
            <ClientNutritionTab
              isLoading={nutritionLoading}
              onAssign={() => setAssignType('nutrition')}
              plans={nutritionPlans}
            />
          )}

          <AssignTemplatePicker
            clientId={id}
            clientName={getClientName(client)}
            isOpen={assignType !== null}
            onOpenChange={(open) => {
              if (!open) setAssignType(null);
            }}
            planType={assignType ?? 'training'}
          />

          <EditClientModal
            client={client}
            isOpen={editOpen}
            onOpenChange={setEditOpen}
          />
        </>
      ) : null}
    </div>
  );
}
