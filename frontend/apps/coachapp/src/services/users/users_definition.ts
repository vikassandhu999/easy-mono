import {z} from 'zod';

export const SignUp_zod = z.object({
    email: z.string().email(),
});

export const Login_zod = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const Verify_zod = z.object({
    passcode: z.string().min(4).max(6),
    token_id: z.string().uuid(),
});

export const ResendVerify_zod = z.object({
    token_id: z.string().uuid(),
});

export const PasswordReset_zod = z.object({
    email: z.string().email(),
});

export const PasswordResetConfirm_zod = z.object({
    passcode: z.string().min(4).max(6),
    password: z.string().min(6),
    token_id: z.string().uuid(),
});

export type LoginProps = z.infer<typeof Login_zod>;
export type PasswordResetConfirmProps = z.infer<typeof PasswordResetConfirm_zod>;
export type PasswordResetProps = z.infer<typeof PasswordReset_zod>;
export type RefreshTokenProps = {
    refresh_token: string;
};
export type ResendVerifyProps = z.infer<typeof ResendVerify_zod>;
export type SignUpProps = z.infer<typeof SignUp_zod>;
export interface TokenID {
    token_id: string;
}

export interface User {
    email: string;
    id: string;
}

export type VerifyProps = z.infer<typeof Verify_zod>;
