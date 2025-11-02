import {useCallback, useState} from 'react';

type DrawerView = null | string;

type DrawerState<TData = unknown> = {
    data: null | TData;
    isOpen: boolean;
    view: DrawerView;
};

export interface SimpleDrawerController<TData = unknown> {
    close: () => void;
    data: null | TData;
    isOpen: boolean;
    navigate: (view: DrawerView, data?: null | TData) => void;
    open: (view: DrawerView, data?: null | TData) => void;
    view: DrawerView;
}

export function useSimpleDrawer<TData = unknown>(): SimpleDrawerController<TData> {
    const [state, setState] = useState<DrawerState<TData>>({
        data: null,
        isOpen: false,
        view: null,
    });

    const open = useCallback((view: DrawerView, data?: null | TData) => {
        setState({
            data: data ?? null,
            isOpen: true,
            view,
        });
    }, []);

    const close = useCallback(() => {
        setState({
            data: null,
            isOpen: false,
            view: null,
        });
    }, []);

    const navigate = useCallback((view: DrawerView, data?: null | TData) => {
        setState((prev) => ({
            data: data ?? prev.data,
            isOpen: prev.isOpen,
            view,
        }));
    }, []);

    return {
        close,
        data: state.data,
        isOpen: state.isOpen,
        navigate,
        open,
        view: state.view,
    };
}
