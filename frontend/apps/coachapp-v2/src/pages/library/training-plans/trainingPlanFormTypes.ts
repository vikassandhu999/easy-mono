import type {ResourceStatus} from '@/pages/library/libraryFormShared';

export type TrainingPlanFormValues = {
  client_id: string;
  description: string;
  end_date: string;
  is_template: boolean;
  name: string;
  start_date: string;
  status: ResourceStatus;
};
