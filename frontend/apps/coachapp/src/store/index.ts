import {configureStore} from '@reduxjs/toolkit';
import {setupListeners} from '@reduxjs/toolkit/query';

import {baseAPISlice} from '@/store/services/baseAPISlice';

export const store = configureStore({
    reducer: {
        [baseAPISlice.reducerPath]: baseAPISlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseAPISlice.middleware),
});

setupListeners(store.dispatch);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
