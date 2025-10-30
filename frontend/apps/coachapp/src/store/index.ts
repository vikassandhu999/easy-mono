import {configureStore} from '@reduxjs/toolkit';
import {setupListeners} from '@reduxjs/toolkit/query';
import {FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import {baseAPISlice} from '@/store/services/baseAPISlice';
import planLabelsReducer from '@/store/slices/planLabelsSlice';

const planLabelsPersistConfig = {
    key: 'coacheasy_plan_labels',
    storage,
    version: 1,
    whitelist: ['uncommittedLabels'],
};

const persistedPlanLabelsReducer = persistReducer(planLabelsPersistConfig, planLabelsReducer);

export const store = configureStore({
    reducer: {
        [baseAPISlice.reducerPath]: baseAPISlice.reducer,
        planLabels: persistedPlanLabelsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }).concat(baseAPISlice.middleware),
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
