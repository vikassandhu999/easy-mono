import React, { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  Text,
  Button,
  Stack,
  Group,
  ActionIcon,
  Divider,
  Alert,
  Loader,
  Box,
  Card,
} from "@mantine/core";
import {
  IconPlus,
  IconX,
  IconGripVertical,
  IconTarget,
  IconAlertCircle,
} from "@tabler/icons-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useQuery } from "@tanstack/react-query";
import { MetricsAPI } from "@/Api/Metrics";
import { ContentType } from "@/Api/Contents";
import { useDrawerStack } from "@/Providers/StackProvider";

interface MetricItemProps {
  metric: string;
  index: number;
  onRemove: (index: number) => void;
  getDisplayName: (metricName: string) => string;
}

const MetricItem: React.FC<MetricItemProps> = ({
  metric,
  index,
  onRemove,
  getDisplayName,
}) => (
  <Draggable key={metric} draggableId={metric} index={index}>
    {(provided) => (
      <div ref={provided.innerRef} {...provided.draggableProps}>
        <Card
          withBorder
          p={"xs"}
          style={{
            cursor: "pointer",
            borderRadius: 8,
            transition: "all 200ms ease",
            borderColor: "var(--mantine-color-gray-3)",
            backgroundColor: "white",
            transform: "scale(1)",
          }}
          styles={{
            root: {
              "&:hover": {
                borderColor: "var(--mantine-color-blue-4)",
                backgroundColor: "var(--mantine-color-blue-0)",
                transform: "scale(1.02)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              },
            },
          }}
        >
          <Group>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              {...provided.dragHandleProps}
              style={{ cursor: "grab", minWidth: 36 }}
            >
              <IconGripVertical size={18} />
            </ActionIcon>

            <Box style={{ flex: 1 }}>
              <Text size="md" fw={500}>
                {getDisplayName(metric)}
              </Text>
            </Box>

            <ActionIcon
              variant="subtle"
              color="red"
              size="lg"
              onClick={() => onRemove(index)}
              style={{ minWidth: 36 }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Card>
      </div>
    )}
  </Draggable>
);

interface MetricsPickerProps {
  opened: boolean;
  onClose: () => void;
  value: string[];
  onChange: (metrics: string[]) => void;
  contentType?: ContentType;
}

export const MetricsPicker: React.FC<MetricsPickerProps> = ({
  opened,
  onClose,
  value,
  onChange,
  contentType,
}) => {
  const stack = useDrawerStack();

  const [metrics, setMetrics] = useState(value);

  useEffect(() => {
    if (opened) {
      setMetrics(value);
    }
  }, [opened, value]);

  // Fetch metrics from API
  const {
    data: metricsResult,
    isLoading: isLoadingMetrics,
    error: metricsError,
  } = useQuery({
    queryKey: ["metrics", contentType],
    queryFn: async () => {
      const result = await MetricsAPI.listMetrics({
        content_type: contentType,
      });
      if (result.isError) throw result.getError();
      return result.getValue();
    },
    // enabled: opened, // Only fetch when modal is open
  });

  const handleRemoveMetric = (index: number) => {
    const updated = metrics.filter((_, i) => i !== index);
    setMetrics(updated);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(metrics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMetrics(items);
  };

  const handleSave = () => {
    onChange(metrics);
    stack.close("metrics-picker"); // Close the drawer
    onClose();
  };

  const handleCancel = () => {
    setMetrics(value); // Reset to original values
    stack.close("metrics-picker"); // Close the drawer
    onClose();
  };

  // Memoized utility functions
  const getDisplayNameByKey = useMemo(() => {
    return (key: string): string => {
      if (!metricsResult?.records) return key;
      const metric = metricsResult.records.find((m) => m.key === key);
      return metric ? metric.display_name : key;
    };
  }, [metricsResult?.records]);

  // Memoized derived data
  const suggestedMetrics = useMemo(() => {
    return metricsResult?.records || [];
  }, [metricsResult?.records]);

  const availableSuggestions = useMemo(() => {
    return suggestedMetrics.filter((metric) => !metrics.includes(metric.key));
  }, [suggestedMetrics, metrics]);

  return (
    <Drawer
      {...stack.register("metrics-picker")}
      title={
        <Group gap="xs">
          <IconTarget size={20} />
          <Text fw={600} size="lg">
            Metrics
            {contentType && (
              <Text span c="dimmed" fw={400} ml={4}>
                for {contentType}
              </Text>
            )}
          </Text>
        </Group>
      }
    >
      <Stack gap={0}>
        {/* Content Section */}
        <Box style={{ flex: 1, minHeight: 0 }}>
          {/* Current metrics with drag & drop */}
          {metrics.length > 0 ? (
            <Stack px={"md"} gap={"xs"}>
              <Text size="sm" fw={600} mb="sm">
                Current Metrics ({metrics.length})
              </Text>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="metrics">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      <Stack gap="sm">
                        {metrics.map((metric, index) => (
                          <MetricItem
                            key={metric}
                            metric={metric}
                            index={index}
                            onRemove={handleRemoveMetric}
                            getDisplayName={getDisplayNameByKey}
                          />
                        ))}
                        {provided.placeholder}
                      </Stack>
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </Stack>
          ) : (
            <Box p="lg">
              <Alert variant="light" color="blue">
                <Text size="sm" ta="center">
                  No metrics added yet. Metrics help track progress and provide
                  structure to content. Select from the suggested metrics below
                  to get started.
                </Text>
              </Alert>
            </Box>
          )}

          {/* Suggested metrics */}
          {isLoadingMetrics ? (
            <Box p="lg">
              <Group justify="center" gap="sm">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Loading suggested metrics...
                </Text>
              </Group>
            </Box>
          ) : metricsError ? (
            <Box p="lg">
              <Alert
                variant="light"
                color="orange"
                icon={<IconAlertCircle size={16} />}
              >
                <Text size="sm">
                  Unable to load metric suggestions. You can still add custom
                  metrics manually.
                </Text>
              </Alert>
            </Box>
          ) : availableSuggestions.length > 0 ? (
            <Box p="lg" pb="md">
              <Text size="sm" fw={600} mb="md">
                Suggested Metrics
                {contentType && (
                  <Text span c="dimmed" fw={400} ml={4}>
                    for ( {contentType} )
                  </Text>
                )}
              </Text>
              <Stack gap="sm">
                {availableSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion.key}
                    variant="light"
                    color="blue"
                    size="sm"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => {
                      setMetrics((prev) => [...prev, suggestion.key]);
                    }}
                    justify="flex-start"
                    style={{
                      minHeight: 44, // Better touch target
                      height: "auto",
                      whiteSpace: "normal",
                    }}
                  >
                    {suggestion.display_name}
                  </Button>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Box>

        <Divider />

        <Box p="lg" pt="md" pos={"sticky"}>
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </Group>
        </Box>
      </Stack>
    </Drawer>
  );
};
