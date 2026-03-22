import {ActionIcon, Group, Stack, Text, Title} from '@mantine/core';
import {ArrowLeftIcon} from '@phosphor-icons/react';

type Props = {
  actions?: React.ReactNode;
  onBack?: () => void;
  showTitle?: boolean;
  title: string;
  description?: string;
};

export default function Header({actions, onBack, showTitle = true, title, description}: Props) {
  return (
    <Stack gap="xs">
      <Group
        align="center"
        gap="sm"
        justify="space-between"
        w="100%"
        wrap="nowrap"
      >
        <Group
          align="center"
          gap="sm"
          style={{flex: 1, minWidth: 0}}
          wrap="nowrap"
        >
          {onBack && (
            <ActionIcon
              c="dark"
              onClick={onBack}
              radius="xl"
              size="xl"
              variant="subtle"
            >
              <ArrowLeftIcon size={28} />
            </ActionIcon>
          )}
          {showTitle && (
            <Title
              fw="bolder"
              lineClamp={1}
              order={4}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={title}
            >
              {title}
            </Title>
          )}
        </Group>
        {actions && (
          <Group
            gap="xs"
            style={{flexShrink: 0}}
          >
            {actions}
          </Group>
        )}
      </Group>
      {description && (
        <Text
          c="dimmed"
          fs="italic"
          size="sm"
        >
          {description}
        </Text>
      )}
    </Stack>
  );
}
