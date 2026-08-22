import {Button, toast} from '@heroui/react';
import {useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {clearTokens} from '@/api/authStorage';
import {useGetClientProfileQuery} from '@/api/profile';
import {queryClient} from '@/api/query-client';
import {ROUTES} from '@/routes';

/**
 * Shown instead of the app shell when the client's status is `awaiting_seat`
 * (invited but the coach hasn't activated a paid seat for them yet). Blocks
 * all shell routes — no plans, logging, or workflows — until the coach acts.
 */
export function AwaitingSeatScreen() {
  const {data: profile, refetch, isFetching} = useGetClientProfileQuery();
  const navigate = useNavigate();
  const businessName = profile?.data.coach?.business_name;

  const handleLogout = useCallback(() => {
    clearTokens();
    queryClient.clear();
    navigate(ROUTES.LOGIN);
  }, [navigate]);

  const handleCheck = async () => {
    const result = await refetch();
    if (result.data?.data.status === 'active') {
      toast.success('Seat activated — welcome in!');
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      {businessName ? <p className="text-sm font-semibold text-muted">{businessName}</p> : null}
      <h1 className="text-xl font-semibold text-foreground">You're almost in</h1>
      <p className="text-sm text-muted">Your coach needs to activate your seat before you can continue.</p>
      <div className="mt-4 flex gap-3">
        <Button
          isPending={isFetching}
          onPress={handleCheck}
          size="sm"
          variant="secondary"
        >
          Check again
        </Button>
        <Button
          onPress={handleLogout}
          size="sm"
          variant="ghost"
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
