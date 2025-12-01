import {Group, Stack, Title} from '@mantine/core';

import HeadingContainer from '@/shared/container/HeaderContainer';

const ScheduleHeader = () => {
    return (
        <HeadingContainer
            style={{
                paddingInline: 'var(--ce-size-lg)',
                paddingBlock: 'var(--ce-size-sm)',
            }}
            withBorder={false}
        >
            <Stack gap="md">
                <Group
                    align="start"
                    justify="space-between"
                    w="100%"
                    wrap="nowrap"
                >
                    <Stack
                        gap="0"
                        style={{flex: 1}}
                    >
                        <Title order={5}>Schedule</Title>
                    </Stack>
                </Group>
            </Stack>
        </HeadingContainer>
    );
};

export default ScheduleHeader;
