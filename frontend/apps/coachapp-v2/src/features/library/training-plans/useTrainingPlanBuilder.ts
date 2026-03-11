import {toast} from '@heroui/react';
import {useMemo, useState} from 'react';

import {useGetClientQuery} from '@/entities/clients/api/clients';
import {
  useCreatePlannedWorkoutMutation,
  useDuplicateTrainingPlanMutation,
  useGetTrainingPlanQuery,
} from '@/entities/trainingPlans/api/trainingPlans';

type UseTrainingPlanBuilderParams = {
  onDuplicated: (newPlanId: string) => void;
  planId: string;
};

export default function useTrainingPlanBuilder({onDuplicated, planId}: UseTrainingPlanBuilderParams) {
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAddingDay, setIsAddingDay] = useState(false);

  const {
    data: planData,
    isError: isPlanError,
    isLoading: isPlanLoading,
    refetch: refetchPlan,
  } = useGetTrainingPlanQuery(planId, {skip: !planId});
  const [duplicateTrainingPlan, {isLoading: isDuplicating}] = useDuplicateTrainingPlanMutation();
  const [createPlannedWorkout, {isLoading: isCreatingDay}] = useCreatePlannedWorkoutMutation();

  const plan = planData?.data;

  const {data: clientData} = useGetClientQuery(plan?.client_id ?? '', {skip: !plan?.client_id});
  const client = clientData?.data;
  const clientDisplay = client
    ? {id: client.id, name: [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email}
    : null;

  const sortedWorkouts = useMemo(
    () => (plan?.planned_workouts ?? []).toSorted((a, b) => a.day_number - b.day_number),
    [plan?.planned_workouts],
  );

  const nextDayIndex = sortedWorkouts.length > 0 ? Math.max(...sortedWorkouts.map((w) => w.day_number)) % 7 : 0;

  const handleDuplicatePlan = async () => {
    if (!planId) return;
    try {
      const res = await duplicateTrainingPlan(planId).unwrap();
      toast.success('Plan duplicated');
      onDuplicated(res.data.id);
    } catch {
      toast.danger('Failed to duplicate plan');
    }
  };

  const handleAddWorkout = async (dayNumber: number, name: string) => {
    try {
      await createPlannedWorkout({body: {day_number: dayNumber, name}, planId}).unwrap();
      toast.success('Workout added');
      setIsAddingDay(false);
    } catch {
      toast.danger('Failed to add workout');
    }
  };

  return {
    clientDisplay,
    handleAddWorkout,
    handleDuplicatePlan,
    isAddingDay,
    isAssignOpen,
    isCreatingDay,
    isDuplicating,
    isPlanError,
    isPlanLoading,
    nextDayIndex,
    plan,
    refetchPlan,
    setIsAddingDay,
    setIsAssignOpen,
    sortedWorkouts,
  };
}
