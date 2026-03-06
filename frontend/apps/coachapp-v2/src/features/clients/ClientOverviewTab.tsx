import {Button, Card} from '@heroui/react';
import {useNavigate} from '@tanstack/react-router';
import {Dumbbell, Pencil, UtensilsCrossed} from 'lucide-react';

import type {Client} from '@/entities/clients/api/clients';
import type {NutritionPlan} from '@/entities/nutritionPlans/api/nutritionPlans';
import type {TrainingPlan} from '@/entities/trainingPlans/api/trainingPlans';

import {CLIENT_STATUS_STYLES, formatDateTime, getClientName} from '@/features/clients/clientDisplay';
import {formatDate} from '@/shared/lib/format/formatHelpers';

type ClientOverviewTabProps = {
  client: Client;
  nutritionPlans: NutritionPlan[];
  onAssignNutrition: () => void;
  onAssignTraining: () => void;
  onEditClient: () => void;
  trainingPlans: TrainingPlan[];
};

export default function ClientOverviewTab({
  client,
  nutritionPlans,
  onAssignNutrition,
  onAssignTraining,
  onEditClient,
  trainingPlans,
}: ClientOverviewTabProps) {
  const navigate = useNavigate();

  const activeTraining = trainingPlans.find((p) => p.status === 'active');
  const activeNutrition = nutritionPlans.find((p) => p.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-separator bg-surface p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-foreground">{getClientName(client)}</h2>
            <p className="text-sm text-muted">{client.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${CLIENT_STATUS_STYLES[client.status.toLowerCase()] ?? 'bg-default text-muted'}`}
            >
              {client.status}
            </span>
            <Button
              isDisabled
              onPress={onEditClient}
              size="sm"
              variant="ghost"
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Phone</p>
            <p className="text-sm text-foreground">{client.phone || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Email</p>
            <p className="text-sm text-foreground">{client.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Joined</p>
            <p className="text-sm text-foreground">{formatDate(client.inserted_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Last updated</p>
            <p className="text-sm text-foreground">{formatDateTime(client.updated_at)}</p>
          </div>
        </div>

        {client.notes ? (
          <div className="mt-4">
            <p className="text-xs text-muted">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{client.notes}</p>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border border-separator bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted" />
            <p className="text-sm font-medium text-foreground">Active training plan</p>
          </div>
          {activeTraining ? (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-foreground">{activeTraining.name}</p>
              <p className="text-xs text-muted">
                {activeTraining.planned_workouts.length} workout
                {activeTraining.planned_workouts.length !== 1 ? 's' : ''}
              </p>
              <Button
                className="mt-1 w-fit"
                onPress={() => navigate({to: `/library/training-plans/${activeTraining.id}/builder`})}
                size="sm"
                variant="ghost"
              >
                View plan
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">No active training plan</p>
              <Button
                className="w-fit"
                onPress={onAssignTraining}
                size="sm"
                variant="ghost"
              >
                Assign plan
              </Button>
            </div>
          )}
        </Card>

        <Card className="border border-separator bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-muted" />
            <p className="text-sm font-medium text-foreground">Active nutrition plan</p>
          </div>
          {activeNutrition ? (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-foreground">{activeNutrition.name}</p>
              <p className="text-xs text-muted">
                {activeNutrition.meals.length} meal
                {activeNutrition.meals.length !== 1 ? 's' : ''}
              </p>
              <Button
                className="mt-1 w-fit"
                onPress={() => navigate({to: `/library/nutrition-plans/${activeNutrition.id}/builder`})}
                size="sm"
                variant="ghost"
              >
                View plan
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">No active nutrition plan</p>
              <Button
                className="w-fit"
                onPress={onAssignNutrition}
                size="sm"
                variant="ghost"
              >
                Assign plan
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Card className="border border-separator bg-surface p-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-muted">Training plans</p>
            <p className="text-lg font-semibold text-foreground">{trainingPlans.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Nutrition plans</p>
            <p className="text-lg font-semibold text-foreground">{nutritionPlans.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Client since</p>
            <p className="text-lg font-semibold text-foreground">{formatDate(client.inserted_at)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
