import { Card, Stack, Text, Group, Box } from "@mantine/core";
import React from "react";

export const TimeSlotList = ({
  label,
  action,
  actionLabel,
  children,
  icon,
  color,
}: {
  label?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  action?: () => void;
  color?: string;
  children: React.ReactNode;
}) => {
  return (
    <Card
      p="md"
      shadow="none"
      style={{
        background: "rgb(255, 255, 255)",
        borderLeft: `2px solid var(--mantine-color-gray-3)`,
        position: "relative",
        overflow: "visible", // Allow icon to show outside card bounds
      }}
    >
      <Box
        style={{
          position: "absolute",
          top: -2, // Align with card top
          left: -22, // Move further left to show more of the icon
          zIndex: 15,
          padding: `var(--mantine-spacing-sm)`,
          background: "white", // Add background to ensure visibility
          borderRadius: "50%", // Make it circular
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)", // Add subtle shadow
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {React.cloneElement(icon as React.ReactElement, {
          color: color,
        })}
      </Box>
      <Stack gap="xs">
        <Group mb="md" justify="apart">
          <Text fw={600} ml="sm" c="dimmed" size="sm" tt="uppercase">
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

export default TimeSlotList;
