import {useMediaQuery} from '@mantine/hooks';
import {useMantineTheme} from '@mantine/core';

export const useMobile = () => {
    const theme = useMantineTheme();
    return useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
};

export const useTablet = () => {
    const theme = useMantineTheme();
    return useMediaQuery(`(max-width: ${theme.breakpoints.md})`);
};
