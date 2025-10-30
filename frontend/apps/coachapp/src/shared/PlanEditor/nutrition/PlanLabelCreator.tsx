import {Button, Stack, Text} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';

const PlanLabelCreator = () => {
    return (
        <>
            <Stack gap="xs">
                <Button
                    leftSection={<IconPlus size={18} />}
                    radius="md"
                    size="sm"
                    variant="subtle"
                    w="max-content"
                >
                    Create a label
                </Button>
                <Text
                    c="dimmed"
                    fs="italic"
                    size="xs"
                >
                    Labels organize meals in a day (e.g., Breakfast, Lunch, Dinner)
                </Text>
            </Stack>
        </>
    );
};

export default PlanLabelCreator;
