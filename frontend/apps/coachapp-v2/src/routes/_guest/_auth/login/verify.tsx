import {createFileRoute} from '@tanstack/react-router';

import VerifyPage from '@/features/auth/VerifyPage';

export const Route = createFileRoute('/_guest/_auth/login/verify')({
  component: VerifyPage,
});
