import {useMantineTheme} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';

export const useMobileFirst = () => {
    const theme = useMantineTheme();

    return {
        isDesktop: useMediaQuery(`(min-width: ${theme.breakpoints.md})`),
        isMobile: useMediaQuery(`(max-width: ${theme.breakpoints.sm})`),
        isSmallMobile: useMediaQuery('(max-width: 480px)'),
        isTablet: useMediaQuery(`(max-width: ${theme.breakpoints.md})`),
    };
};
