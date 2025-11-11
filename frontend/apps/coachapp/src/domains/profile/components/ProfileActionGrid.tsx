import {Card, Group, SimpleGrid, Text} from '@mantine/core';
import {FC} from 'react';

import {ActionGridConfig} from '../ui_config';

const ProfileActionGrid: FC<{configs: ActionGridConfig}> = ({configs}) => {
    return (
        <>
            <SimpleGrid cols={2}>
                {configs.map(({id, label, icon}) => {
                    const IconElem = icon;
                    return (
                        <Card
                            key={id}
                            withBorder
                        >
                            <Group>
                                <IconElem />
                                <Text>{label}</Text>
                            </Group>
                        </Card>
                    );
                })}
            </SimpleGrid>
        </>
    );
};

export default ProfileActionGrid;
