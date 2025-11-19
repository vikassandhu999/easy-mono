import {configureStore} from '@reduxjs/toolkit';
import {setupListeners} from '@reduxjs/toolkit/query';
import {type TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';
import {FLUSH, PAUSE, PERSIST, persistStore, PURGE, REGISTER, REHYDRATE} from 'redux-persist';

import {baseAPISlice} from '@/services/baseAPISlice';
import {authReducerPersisted} from '@/slices/authSlice';
import {planLabelsReducerPersisted} from '@/slices/planLabelsSlice';

/* Redux store configuration */
export const store = configureStore({
    reducer: {
        [baseAPISlice.reducerPath]: baseAPISlice.reducer,
        auth: authReducerPersisted,
        planLabels: planLabelsReducerPersisted,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }).concat(baseAPISlice.middleware),
});

/* For persisted storage  */
export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

/* Typed hooks  */
export const useAppDispatch: () => AppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
