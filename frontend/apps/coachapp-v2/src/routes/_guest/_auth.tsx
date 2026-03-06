import {Card} from '@heroui/react';
import {createFileRoute, Outlet} from '@tanstack/react-router';

export const Route = createFileRoute('/_guest/_auth')({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <Card className="w-full max-w-md border border-divider/50 bg-background p-6 shadow-medium">
        <Outlet />
      </Card>
    </div>
  );
}
