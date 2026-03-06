import {createFileRoute} from '@tanstack/react-router';

import VerifyPage from '@/features/auth/VerifyPage';

export const Route = createFileRoute('/_guest/_auth/register/verify')({
  component: VerifyPage,
});
