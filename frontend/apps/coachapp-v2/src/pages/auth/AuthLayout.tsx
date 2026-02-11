import {Card} from '@heroui/react';
import {Outlet} from 'react-router';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <Card className="w-full max-w-md border border-divider/50 bg-background p-6 shadow-medium">
        <Outlet />
      </Card>
    </div>
  );
}
