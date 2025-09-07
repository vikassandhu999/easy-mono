import {ReactNode} from 'react';
import {MainLayout} from './MainLayout/MainLayout';

interface ProtectedLayoutProps {
    children: ReactNode;
}

export function ProtectedLayout({children}: ProtectedLayoutProps) {
    return <MainLayout>{children}</MainLayout>;
}
