import { Card, Stack, Text, Group, Box } from "@mantine/core";
import React from "react";

export const ListingGroup = ({
  label,
  action,
  actionLabel,
  children,
  icon,
}: {
  label?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  action?: () => void;
  children: React.ReactNode;
}) => {
  return (
    <Card
      p="md"
      withBorder
      style={{
        background: "rgb(255, 255, 255)",
        position: "relative",
      }}
    >
      <Stack gap="xs">
        <Box
          style={{
            position: "absolute",
            left: -10,
            zIndex: 1,
          }}
        >
          <Text fw={600} c="dimmed" size="sm" tt="uppercase">
            {icon &&
              React.cloneElement(icon as React.ReactElement, {
                color: "var(--mantine-color-red-2)",
              })}
          </Text>
        </Box>
        <Group mb="md" justify="apart">
          <Text fw={600} c="dimmed" size="sm" tt="uppercase">
            {label}
          </Text>

          {action && (
            <Text
              size="sm"
              c="blue"
              style={{ cursor: "pointer" }}
              onClick={action}
            >
              {actionLabel}
            </Text>
          )}
        </Group>
        {children}
      </Stack>
    </Card>
  );
};

export default ListingGroup;
