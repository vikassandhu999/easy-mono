import {Dispatch, SetStateAction, useEffect, useState} from 'react';

export const useDebouncedValue = <V>(inital: V, delayMs: number): [V, V, Dispatch<SetStateAction<V>>] => {
    const [debouncedValue, setDebouncedValue] = useState(inital);
    const [value, setValue] = useState(inital);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(() => value);
        }, delayMs);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delayMs]);

    return [value, debouncedValue, setValue];
};
