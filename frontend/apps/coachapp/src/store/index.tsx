import {configureStore} from '@reduxjs/toolkit';
import {Provider} from 'react-redux';

export const store = configureStore({
    reducer: {},
});

export const StoreProvider = ({children}: {children: React.ReactNode}) => {
    return <Provider store={store}>{children}</Provider>;
};

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
