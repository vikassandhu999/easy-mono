import {useEffect, useState} from 'react';

type SaveStatus = 'saved' | 'saving' | 'error';

export const useAutoSave = <T>(data: T, saveFunction: (data: T) => Promise<void>, delay = 2000) => {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [lastSavedData, setLastSavedData] = useState<T>(data);

    useEffect(() => {
        // Don't save if data hasn't changed
        if (JSON.stringify(data) === JSON.stringify(lastSavedData)) {
            return;
        }

        const timer = setTimeout(() => {
            setSaveStatus('saving');
            saveFunction(data)
                .then(() => {
                    setSaveStatus('saved');
                    setLastSavedData(data);
                })
                .catch(() => setSaveStatus('error'));
        }, delay);

        return () => clearTimeout(timer);
    }, [data, saveFunction, delay, lastSavedData]);

    return saveStatus;
};
