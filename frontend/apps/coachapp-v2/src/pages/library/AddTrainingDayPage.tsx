import {Button, Card} from '@heroui/react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {useGetTrainingPlanQuery} from '@/api/trainingPlans';
import {AddDayForm} from '@/components/training-plan/AddTrainingDayForm';

export default function AddTrainingDayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const planId = id ?? '';

  const returnTo = (location.state as null | {from?: string})?.from ?? `/library/training-plans/${planId}/builder`;

  const {data: planData, isLoading: isPlanLoading} = useGetTrainingPlanQuery(planId, {skip: !planId});

  const plan = planData?.data;

  if (isPlanLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-sm text-muted">Loading plan...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card className="rounded-xl border border-separator bg-surface p-6">
          <p className="font-semibold text-foreground">Plan not found</p>
          <Button
            className="mt-4 min-h-11"
            onPress={() => navigate(returnTo)}
            variant="outline"
          >
            Back
          </Button>
        </Card>
      </div>
    );
  }

  const nextDayNumber = plan.planned_workouts?.length
    ? Math.max(...plan.planned_workouts.map((w) => w.day_number)) + 1
    : 1;

  // Render form only when we have the nextDayNumber derived from data.
  // Using key to ensure it re-initializes if for some reason plan changes (unlikely here but good practice)
  return (
    <AddDayForm
      key={plan.id}
      nextDayNumber={nextDayNumber}
      onNavigateBack={() => navigate(returnTo)}
      planId={planId}
      planName={plan.name}
    />
  );
}
