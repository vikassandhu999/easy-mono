import {Button, Group, Text, Title} from '@mantine/core';
import React from 'react';

import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';

interface ScheduleChoiceProps {
    onSelect: (data: 'later' | 'now') => void;
}

export const ScheduleChoice: React.FC<ScheduleChoiceProps> = ({onSelect}) => {
    return (
        <PagePaper>
            <HeadingContainer paddingY={'xs'}>
                <Group
                    align={'center'}
                    justify={'start'}
                    wrap={'nowrap'}
                >
                    <Title
                        lineClamp={1}
                        order={4}
                    >
                        Build Schedule?
                    </Title>
                </Group>
            </HeadingContainer>

            <PaddingContainer
                paddingX={'sm'}
                paddingY={'xl'}
            >
                <Text
                    mb="md"
                    size="md"
                >
                    Do you want to set up a schedule for this program now? A schedule maps out your sessions, keeps
                    clients on track, and makes progress easy to follow.
                </Text>
                <Group grow>
                    <Button
                        onClick={() => onSelect('later')}
                        variant="outline"
                    >
                        Skip for now
                    </Button>
                    <Button onClick={() => onSelect('now')}>Create schedule</Button>
                </Group>
            </PaddingContainer>
        </PagePaper>
    );
};
