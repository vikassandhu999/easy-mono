import {TrainingPlan} from '@/services/training_plans';

interface TrainingPlanCardProps {
  onClick?: (id: string) => void;
  plan: TrainingPlan;
}

const TrainingPlanCard = ({plan, onClick}: TrainingPlanCardProps) => {
  const workoutCount = plan.workouts?.length ?? 0;

  const handleClick = () => {
    onClick?.(plan.id);
  };

  return (
    <button
      aria-label={`Training plan: ${plan.name}`}
      className={
        'w-full flex gap-2 p-3 shadow rounded-2xl border border-gray-200 cursor-pointer bg-surface hover:shadow-md hover:bg-surface-hover'
      }
      onClick={handleClick}
    >
      <div className={'flex flex-nowrap gap-4 items-center'}>
        <div className={'flex-1 flex flex-col items-start gap-1'}>
          <h3 className={'text-sm text-start font-semibold'}>{plan.name}</h3>

          {workoutCount === 0 && plan.description && <p className={'text-sm text-gray-600'}>{plan.description}</p>}

          {workoutCount > 0 && (
            <p className={'text-sm text-gray-600'}>
              {workoutCount} {workoutCount === 1 ? 'Workout' : 'Workouts'}
            </p>
          )}
        </div>
      </div>
    </button>
  );
};

export default TrainingPlanCard;
