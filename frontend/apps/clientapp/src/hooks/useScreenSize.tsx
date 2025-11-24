import {useMantineTheme} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';

type ScreenSize = 'desktop' | 'mobile' | 'tab';

const useScreenSize = () => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const isTab = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);
    const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints.lg})`);

    const screen: ScreenSize = isMobile ? 'mobile' : isTab ? 'tab' : 'desktop';

    return {isMobile, isTab, isDesktop, screen};
};

export default useScreenSize;
