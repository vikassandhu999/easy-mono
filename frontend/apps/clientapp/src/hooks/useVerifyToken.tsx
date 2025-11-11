import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import {useMutation} from '@tanstack/react-query';
import {AuthAPI, LoginResponse} from '@/api/auth';
import {notifications} from '@mantine/notifications';
import { Result } from '@/utils/error';

export const useVerifyToken = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const {mutate: verify, isPending} = useMutation({
        mutationFn: () => {
            return new Promise<LoginResponse>((resolve, reject) => {
                setTimeout(() => {
                    AuthAPI.signIn({email, invitation_token: token})
                        .then(resolve)
                        .catch(reject);
                }, 2000); // 1.2 seconds delay
            });
        },
        onSuccess: (result: Result<LoginResponse>) => {

            if (!result.isError) {

                notifications.show({
                            title: 'Invitation Verified',
                            message: result.value?.message ??  'Your invitation has been successfully verified. Please enter the code sent to your email.',
                            color: 'green',
                });
        
                // Create search params for the SignInCodePage
                const params = new URLSearchParams({
                    token_id: result.value.token_id,
                    email: email || '',
                    invitation_token: token || ''
                });
                
                navigate('/signin/code?' + params.toString());
            } else {
                console.error('Token verification failed:', result.error);
                setError(result.error?.message || 'Invitation verification failed.');
            }
        },
        onError: (error: Error) => {
            console.error('Token verification failed:', error);
            setError(error.message || 'Invitation verification failed.');
        },
        onSettled: () => {
            setLoading(false);
        },
    });

    useEffect(() => {
        if (token && email) {
            console.log('Verifying token for email:', email);
            verify({email, invitation_token: token});
        } else {
            setError('Invalid verification link. Token or email is missing.');
            setLoading(false);
        }
    }, [token, email, verify]);

    return {loading: isPending || loading, error, email};
};