import {createFileRoute} from '@tanstack/react-router';

import RegisterPage from '@/features/auth/RegisterPage';

export const Route = createFileRoute('/_guest/_auth/register/')({
  component: RegisterPage,
});
