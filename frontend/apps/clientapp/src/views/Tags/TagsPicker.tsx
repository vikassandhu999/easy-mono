import React, { useState } from "react";
import {
  Text,
  Button,
  Stack,
  Group,
  Chip,
  ScrollArea,
  Loader,
  Alert,
  Box,
  Card,
  Drawer,
} from "@mantine/core";
import { IconTags, IconAlertCircle, IconMinus } from "@tabler/icons-react";
import { ContentType } from "@/Api/Contents";
import { useTagGroups } from "@/Hooks/useTagsQueries";
import { useDrawerStack } from "@/Providers/StackProvider";

interface TagsPickerProps {
  opened: boolean;
  onClose: () => void;
  value: string[]; // Array of tag IDs
  onChange: (tagIds: string[]) => void;
  contentType?: ContentType;
}

export const TagsPicker: React.FC<TagsPickerProps> = ({
  opened,
  onClose,
  value,
  onChange,
  contentType,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(value);

  const stack = useDrawerStack();

  // Fetch tag groups for the content type (now includes tags)
  const {
    data: tagGroupsResult,
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useTagGroups({
    contentType,
    enabled: stack.state["tags-picker"] && !!contentType,
  });

  console.log({ opened, contentType });

  const handleSave = () => {
    onChange(selectedTags);
    stack.close("tags-picker"); // Close the drawer
    onClose();
  };

  const handleCancel = () => {
    setSelectedTags(value); // Reset to original values
    stack.close("tags-picker"); // Close the drawer
    onClose();
  };

  // Use all tag groups as-is (no search)
  const tagGroups = tagGroupsResult?.records || [];

  const isLoading = isLoadingGroups;
  const hasError = groupsError;

  return (
    <Drawer
      {...stack.register("tags-picker")}
      title={
        <Group gap="xs">
          <IconTags size={20} />
          <Text fw={600} size="lg">
            Select Tags
            {contentType && (
              <Text span c="dimmed" fw={400} ml={4}>
                for {contentType}
              </Text>
            )}
          </Text>
        </Group>
      }
    >
      <Stack px={"md"} py={"md"} gap={"md"}>
        {/* Header Section */}
        <Stack gap={"xs"}>
          <Text size="sm" c="dimmed">
            Choose tags to help organize and categorize this content.
          </Text>
        </Stack>

        {/* Content Section */}
        <Box style={{ flex: 1, minHeight: 0 }}>
          {/* Content type warning */}
          {!contentType && (
            <Box p="sm">
              <Alert
                variant="light"
                color="orange"
                icon={<IconAlertCircle size={16} />}
                styles={{
                  root: {
                    borderRadius: 8,
                  },
                }}
              >
                <Text size="sm">
                  Select a content type first to see available tags.
                </Text>
              </Alert>
            </Box>
          )}

          {/* Loading state */}
          {isLoading && (
            <Box p="sm">
              <Group justify="center" gap="sm">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Loading tags...
                </Text>
              </Group>
            </Box>
          )}

          {/* Error state */}
          {hasError && (
            <Box p="sm">
              <Alert
                variant="light"
                color="red"
                icon={<IconAlertCircle size={16} />}
                styles={{
                  root: {
                    borderRadius: 8,
                  },
                }}
              >
                <Text size="sm">Failed to load tags. Please try again.</Text>
              </Alert>
            </Box>
          )}

          {/* Tag groups and tags */}
          {!isLoading && contentType && tagGroups.length > 0 && (
            <ScrollArea
              styles={{ root: { minHeight: "60vh" } }}
              scrollbars={"y"}
              type={"never"}
            >
              <Stack gap="sm">
                {tagGroups.map((group) => (
                  <Card
                    key={group.id}
                    withBorder
                    shadow={"xs"}
                    radius={"lg"}
                    style={{
                      background: "rgb(255, 255, 255)",
                    }}
                    p={"md"}
                  >
                    <Stack gap="xs">
                      {/* Tag Group Header */}
                      <Group justify="space-between" mb="md">
                        <Text fw={600} c="dimmed" size="sm" tt="uppercase">
                          {group.name}
                        </Text>
                      </Group>

                      {/* Tags in this group */}
                      {group.tags && group.tags.length > 0 ? (
                        <Chip.Group
                          multiple
                          value={selectedTags.filter((tagId) =>
                            group.tags?.some((tag) => tag.id === tagId)
                          )}
                          onChange={(values) => {
                            // Get all tag IDs from this group
                            const groupTagIds =
                              group.tags?.map((tag) => tag.id) || [];

                            // Remove all tags from this group from current selection
                            const otherSelectedTags = selectedTags.filter(
                              (tagId) => !groupTagIds.includes(tagId)
                            );

                            // Add the newly selected tags from this group
                            setSelectedTags([...otherSelectedTags, ...values]);
                          }}
                        >
                          <Group gap="xs" mt="xs">
                            {group.tags.map((tag) => (
                              <Chip
                                key={tag.id}
                                value={tag.id}
                                size="md"
                                variant={"light"}
                                icon={<IconMinus size={12} />}
                              >
                                <Box>
                                  <Text
                                    size="xs"
                                    style={{
                                      color: "inherit",
                                    }}
                                  >
                                    {tag.name}
                                  </Text>
                                  {tag.description && (
                                    <Text
                                      size="xs"
                                      opacity={0.8}
                                      style={{
                                        color: "inherit",
                                        lineHeight: 1.2,
                                        marginTop: 1,
                                      }}
                                    >
                                      {tag.description}
                                    </Text>
                                  )}
                                </Box>
                              </Chip>
                            ))}
                          </Group>
                        </Chip.Group>
                      ) : (
                        <Text
                          size="sm"
                          c="dimmed"
                          ta="center"
                          py="md"
                          style={{
                            fontStyle: "italic",
                          }}
                        >
                          No tags in this group
                        </Text>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </ScrollArea>
          )}

          {/* No tags available */}
          {!isLoading &&
            contentType &&
            tagGroups.length === 0 &&
            tagGroupsResult && (
              <Box p="sm">
                <Alert
                  variant="light"
                  color="gray"
                  styles={{
                    root: {
                      borderRadius: 8,
                    },
                  }}
                >
                  <Text size="sm" ta="center">
                    {`No tags available for ${contentType} content`}
                  </Text>
                </Alert>
              </Box>
            )}
        </Box>

        {/* Footer Section */}

        <Group justify="flex-end" style={{ position: "sticky", bottom: 0 }}>
          <Button radius="xl" variant="subtle" onClick={handleCancel}>
            Cancel
          </Button>
          <Button radius="xl" onClick={handleSave} size={"sm"}>
            Save tags
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
};
