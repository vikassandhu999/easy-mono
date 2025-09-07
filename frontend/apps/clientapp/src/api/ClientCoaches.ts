import { Result } from '@/Utils/Error';
import { authedClient } from './auth';

// Coach interface for client app
export interface Coach {
    id: string;
    name: string;
    business_name: string;
    business_avatar?: string;
    bio?: string;
    title?: string;
    specialization?: string;
    experience_years?: number;
}

// API to get all coaches available to the client
export const ClientCoachesAPI = {
    // GET /v1/client/coaches - Get all coaches available to this client
    getCoaches: async (): Promise<Result<Coach[]>> => {
        try {
            const response = await authedClient.get('/v1/client/coaches');
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    
    // POST /v1/client/coaches/select - Select a coach (future implementation)
    selectCoach: async (coachId: string): Promise<Result<{ message: string }>> => {
        try {
            const response = await authedClient.post('/v1/client/coaches/select', { coach_id: coachId });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
