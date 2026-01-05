import {z} from 'zod';

// Zod schemas for validation
export const UpdateCoach_zod = z.object({
  bio: z.string().max(500).optional(),
  specialties: z.array(z.string()).optional(),
  credentials: z.record(z.any()).optional(),
});

// User interface (nested in coach response)
export interface User {
  created_at: string;
  email: string;
  email_verified: boolean;
  email_verified_at: null | string;
  full_name: string;
  id: string;
  updated_at: string;
}

// Coach interface
export interface Coach {
  bio: null | string;
  business_id: string;
  created_at: string;
  credentials: Record<string, any>;
  id: string;
  specialties: string[];
  status: string;
  updated_at: string;
  user?: User;
  user_id: string;
}

// Client interface
export interface Client {
  business_id: string;
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  notes: null | string;
  phone: null | string;
  status: string;
  updated_at: string;
  user_id: null | string;
}

// Coach-Client Assignment interface
export interface CoachClientAssignment {
  assigned_at: string;
  assigned_by_id: null | string;
  client_id: string;
  coach_id: string;
  created_at: string;
  id: string;
  updated_at: string;
}

// API Response types
export interface CoachResponse {
  coach: Coach;
}

export interface ClientsResponse {
  clients: Client[];
}

export interface AssignmentResponse {
  assignment: CoachClientAssignment;
}

export interface MessageResponse {
  message: string;
}

// Type exports
export type UpdateCoachProps = z.infer<typeof UpdateCoach_zod>;
