import {Button} from '@heroui/react';
import {useCallback} from 'react';
import {useNavigate} from 'react-router-dom';

import {clearTokens} from '@/api/authStorage';
import {api} from '@/api/base';
import {useGetClientProfileQuery} from '@/api/profile';
import {store} from '@/store';

/**
 * Shown instead of the app shell when the client's status is `awaiting_seat`
 * (invited but the coach hasn't activated a paid seat for them yet). Blocks
 * all shell routes — no plans, logging, or workflows — until the coach acts.
 */
export function AwaitingSeatScreen() {
  const {data: profile} = useGetClientProfileQuery();
  const navigate = useNavigate();
  const businessName = profile?.data.coach.business_name;

  const handleLogout = useCallback(() => {
    clearTokens();
    store.dispatch(api.util.resetApiState());
    navigate('/login');
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      {businessName ? <p className="text-sm font-semibold text-muted">{businessName}</p> : null}
      <h1 className="text-xl font-semibold text-foreground">You're almost in</h1>
      <p className="text-sm text-muted">Your coach needs to activate your seat before you can continue.</p>
      <Button
        className="mt-4"
        onPress={handleLogout}
        size="sm"
        variant="ghost"
      >
        Log out
      </Button>
    </div>
  );
}
