import {createBrowserRouter, RouterProvider} from 'react-router';

import JoinWithCodePage from '@/domains/auth/pages/JoinWithCodePage';
import VerifyEmailPage from '@/domains/auth/pages/VerifyEmailPage';

const router = createBrowserRouter([
    {
        element: <VerifyEmailPage />,
        path: '/',
    },
    {
        element: <JoinWithCodePage />,
        path: '/join',
    },
]);

const AppRouterProvider = () => {
    return (
        <>
            <RouterProvider router={router} />
        </>
    );
};

export default AppRouterProvider;
