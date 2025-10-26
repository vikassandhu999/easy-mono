import React, {PropsWithChildren} from 'react';

import AuthLayout from '@/shared/layouts/AuthLayout';

interface OnboardingScreenProps extends PropsWithChildren {
    maxWidth?: number;
    subtitle?: string;
    title?: string;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({children, subtitle, title}) => {
    return (
        <AuthLayout
            subtitle={subtitle}
            title={title}
        >
            {children}
        </AuthLayout>
    );
};

export default OnboardingScreen;
