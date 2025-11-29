import {z} from 'zod';

export const CreateBusiness_zod = z.object({
    about: z.string().max(1000, 'About must not exceed 1000 characters').optional(),
    handle: z
        .string()
        .regex(/^[a-z0-9_]*$/, 'Handle must only contain lowercase letters, numbers, and underscores')
        .min(2, 'Handle must be at least 2 characters long')
        .max(30, 'Handle must not exceed 30 characters'),
    name: z.string().max(255, 'Name must not exceed 255 characters'),
});

export type CreateBusinessProps = z.infer<typeof CreateBusiness_zod>;

export interface CreateBusinessResponse {
    business_id: string;
    coach_id: string;
}

// Onboarding API types
export const CreateBusinessRequest_zod = z.object({
    name: z.string().min(2, 'Business name must be at least 2 characters'),
    description: z.string().optional(),
});

export type CreateBusinessRequest = z.infer<typeof CreateBusinessRequest_zod>;

export interface Business {
    // Address fields
    address: null | string;
    city: null | string;
    country: null | string;
    description: null | string;
    // Contact fields
    email: null | string;
    handle: string;
    id: string;
    // Timestamps
    inserted_at: string;
    // Branding & settings
    logo_url: null | string;
    name: string;
    phone: null | string;
    postal_code: null | string;
    state: null | string;
    status: string;
    timezone: null | string;
    updated_at: string;
    website: null | string;
}

export const UpdateBusiness_zod = z.object({
    name: z.string().min(1, 'Business name is required').max(255),
    description: z.string().max(1000).optional().nullable(),
    email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
    phone: z.string().max(20).optional().nullable(),
    website: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
    address: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    postal_code: z.string().max(20).optional().nullable(),
    timezone: z.string().optional().nullable(),
});

export type UpdateBusinessProps = z.infer<typeof UpdateBusiness_zod>;

export interface CoachProfile {
    bio: null | string;
    business_id: string;
    credentials: Record<string, unknown>;
    id: string;
    specialties: string[];
    status: string;
    user_id: string;
}

export interface Plan {
    billing_interval: string;
    id: string;
    name: string;
    price_cents: number;
    slug: string;
}

export interface SubscriptionOnboarding {
    business_id: string;
    id: string;
    plan: Plan;
    plan_id: string;
    status: string;
}

export interface CreateBusinessOnboardingResponse {
    business: Business;
    coach_profile: CoachProfile;
    subscription: SubscriptionOnboarding;
}

export type Change = {
    billing_amount?: string;
    billing_days?: number;
    currency_code: string;
    id: string;
    old_plan: Plan;
    old_plan_id: string;
    payment_id?: string;
    phase: string;
    plan: Plan;
    plan_id: string;
    prorated_amount?: string;
    prorated_days?: number;
    start_date: string;
    status: string;
    valid_until: string;
};

export type ListPlans = {
    plans: Plan[];
};

export type PayProps = {
    payment_id: string;
    redirect_url: string;
};

export type PayResponse = {
    pay_params: {
        pay_page_url: string;
    };
    provider_code: 'PHONEPE';
};

export type Price = {
    amount: string;
    currency_code: string;
    previous_amount?: null | string;
    revised_at?: null | string;
};

export type Subscription = {
    active_clients: number;
    end_date?: string;
    ended: boolean;
    ended_at?: string;
    ended_with_reason?: string;
    max_active_clients: number;
    plan?: Plan;
    start_date?: string;
    status: string;
    trial_end_date?: string;
    trial_start_date?: string;
};
