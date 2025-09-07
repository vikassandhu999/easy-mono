import {useMediaQuery} from '@mantine/hooks';
import {useMantineTheme} from '@mantine/core';

export const useMobileFirst = () => {
    const theme = useMantineTheme();

    return {
        isMobile: useMediaQuery(`(max-width: ${theme.breakpoints.sm})`),
        isTablet: useMediaQuery(`(max-width: ${theme.breakpoints.md})`),
        isDesktop: useMediaQuery(`(min-width: ${theme.breakpoints.md})`),
        isSmallMobile: useMediaQuery('(max-width: 480px)'),
    };
};
