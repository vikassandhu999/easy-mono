import React, {PropsWithChildren} from 'react';
import AuthLayout from '@/components/layouts/AuthLayout';

interface OnboardingScreenProps extends PropsWithChildren {
    title?: string;
    subtitle?: string;
    maxWidth?: number;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({children, title, subtitle}) => {
    return (
        <AuthLayout
            title={title}
            subtitle={subtitle}
        >
            {children}
        </AuthLayout>
    );
};

export default OnboardingScreen;
