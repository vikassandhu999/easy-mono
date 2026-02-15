import {Button, Card} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {useGetPlannedWorkoutQuery, useGetTrainingPlanQuery} from '@/api/trainingPlans';
import {EditDayForm} from '@/components/training-plan/EditTrainingDayForm';

export default function EditTrainingDayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id, dayId} = useParams();

  // Strict null checks
  const planId = id ?? '';
  const plannedWorkoutId = dayId ?? '';

  const returnTo = (location.state as null | {from?: string})?.from ?? `/library/training-plans/${planId}/builder`;

  const {data: planData, isLoading: isPlanLoading} = useGetTrainingPlanQuery(planId, {skip: !planId});

  const {data: workoutData, isLoading: isWorkoutLoading} = useGetPlannedWorkoutQuery(plannedWorkoutId, {
    skip: !plannedWorkoutId,
  });

  const plan = planData?.data;
  const workout = workoutData?.data;

  const isLoading = isPlanLoading || isWorkoutLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-sm text-muted">Loading day...</p>
      </div>
    );
  }

  if (!plan || !workout) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card className="rounded-xl border border-separator bg-surface p-6">
          <p className="font-semibold text-foreground">Day not found</p>
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

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        className="min-h-11 w-fit gap-2 px-2"
        onPress={() => navigate(returnTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to builder
      </Button>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Training plan</p>
        <h1 className="text-2xl font-semibold text-foreground">Edit day</h1>
        <p className="text-sm text-muted">
          {plan.name} · Day {workout.day_number}
        </p>
      </div>

      {/* 
        Key prop ensures component remounts if workout ID changes, 
        resetting internal state without useEffect 
      */}
      <EditDayForm
        key={workout.id}
        onNavigateBack={() => navigate(returnTo)}
        planId={planId}
        workout={workout}
      />
    </div>
  );
}
