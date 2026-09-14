import type {ReactNode} from 'react';
import {useProfile} from '../api/auth';
import {Surface} from './page';

export function OwnerOnly({children}: {children: ReactNode}) {
  const profile = useProfile();
  return profile.data?.data.is_owner ? (
    children
  ) : (
    <Surface className="space-y-2">
      <h2 className="section-title">Owner access required</h2>
      <p className="text-sm text-muted-foreground">The business owner manages the team and client assignments.</p>
    </Surface>
  );
}
