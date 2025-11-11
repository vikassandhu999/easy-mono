import * as React from 'react';
import {FC, useMemo} from 'react';

import {User} from '@/services/auth';

import {useAuth} from './AuthProvider';

/**
 * User context value interface
 * Provides access to current user profile data and methods to update it
 */
type UserContextValue = {
    /** Current authenticated user profile, null if not authenticated */
    user: null | User;
    /** Loading state for user profile data */
    isLoading: boolean;
    /** Update the current user profile */
    setUser: (user: null | User) => void;
    /** Clear the current user profile (used on logout) */
    clearUser: () => void;
};

const UserContext = React.createContext<undefined | UserContextValue>(undefined);
UserContext.displayName = 'UserContext';

/**
 * UserProvider component
 * Manages user profile state and provides access throughout the application
 * Now consumes user data from AuthProvider to maintain proper data flow
 *
 * @example
 * ```tsx
 * <AppProvider>
 *   <AuthProvider>
 *     <UserProvider>
 *       <App />
 *     </UserProvider>
 *   </AuthProvider>
 * </AppProvider>
 * ```
 */
const UserProvider: FC<React.PropsWithChildren> = ({children}) => {
    // Get user data and methods from AuthProvider
    const {user, isAuthenticating, setUser, clearUser} = useAuth();

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(
        () => ({
            user,
            isLoading: isAuthenticating,
            setUser,
            clearUser,
        }),
        [user, isAuthenticating, setUser, clearUser],
    );

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;

/**
 * useUser hook
 * Provides access to current user profile data
 *
 * @throws {Error} If used outside of UserProvider
 *
 * @example
 * ```tsx
 * function ProfileComponent() {
 *   const { user, isLoading } = useUser();
 *
 *   if (isLoading) return <Spinner />;
 *   if (!user) return <div>Not authenticated</div>;
 *
 *   return (
 *     <div>
 *       <h1>{user.full_name}</h1>
 *       <p>{user.email}</p>
 *       {user.coach_profile && (
 *         <div>
 *           <p>Business ID: {user.coach_profile.business_id}</p>
 *           <p>Status: {user.coach_profile.status}</p>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUser(): UserContextValue {
    const context = React.useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
