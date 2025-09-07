import { useContents } from "@/Hooks/useContentsQueries";
import { useDebouncedCallback } from "@mantine/hooks";
import { useMemo, useState } from "react";
import RecordsList from "../Layouts/RecordsList";
import { Content, CONTENT_TYPES } from "@/Api/Contents";
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Stack,
  TextInput,
  Text,
  Checkbox,
  Button,
  SegmentedControl,
  Divider,
  Chip,
  ScrollArea,
} from "@mantine/core";
import { FixedBottom } from "../Containers/FixedBottom";
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";

interface ContentCardProps {
  content: Content;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const ContentCard = ({
  content,
  isSelected,
  onToggleSelect,
}: ContentCardProps) => {
  const typeConfig = CONTENT_TYPES.find(
    (type) => type.value === content.type
  ) || {
    value: content.type,
    label: content.type,
    icon: BookOpenIcon,
    description: "Content item",
    color: "var(--mantine-color-gray-1)",
  };
  const IconComponent = typeConfig.icon;

  return (
    <Card
      withBorder
      p="sm"
      style={{
        cursor: "pointer",
        borderRadius: 8,
        transition: "all 200ms ease",
        borderColor: isSelected
          ? "var(--mantine-color-blue-4)"
          : "var(--mantine-color-gray-3)",
        backgroundColor: isSelected ? "var(--mantine-color-blue-0)" : "white",
        transform: "scale(1)",
        boxShadow: isSelected ? "0 2px 8px rgba(59, 130, 246, 0.15)" : "none",
      }}
      styles={{
        root: {
          "&:hover": {
            borderColor: "var(--mantine-color-blue-4)",
            backgroundColor: isSelected
              ? "var(--mantine-color-blue-1)"
              : "var(--mantine-color-blue-0)",
            transform: "scale(1.01)",
            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.2)",
          },
        },
      }}
      onClick={() => onToggleSelect(content.id)}
      role="button"
      tabIndex={0}
      aria-label={`${isSelected ? "Deselect" : "Select"} ${content.name}: ${
        content.instructions || typeConfig.description
      }`}
    >
      <Group gap="sm" wrap="nowrap" align="center">
        <Checkbox
          checked={isSelected}
          onChange={() => onToggleSelect(content.id)}
          onClick={(e) => e.stopPropagation()}
          size="sm"
          color="blue"
        />
        <Center
          w={40}
          h={40}
          style={{
            backgroundColor: typeConfig.color,
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          <IconComponent size={20} color="var(--mantine-color-gray-6)" />
        </Center>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text
            fw={600}
            size="sm"
            lineClamp={1}
            mb={2}
            style={{ lineHeight: 1.3 }}
          >
            {content.name}
          </Text>
          <Text
            size="xs"
            c="dimmed"
            lineClamp={2}
            mb="xs"
            style={{ lineHeight: 1.4 }}
          >
            {content.instructions || typeConfig.description}
          </Text>
          <Group gap="xs" wrap="wrap">
            <Badge
              size="xs"
              variant="light"
              color="blue"
              radius="sm"
              style={{ textTransform: "capitalize" }}
            >
              {typeConfig.label}
            </Badge>
            {content.duration && (
              <Badge size="xs" variant="outline" color="gray" radius="sm">
                {content.duration} min
              </Badge>
            )}
            {!content.is_published && (
              <Badge size="xs" variant="outline" color="yellow" radius="sm">
                Draft
              </Badge>
            )}
          </Group>
        </Box>
      </Group>
    </Card>
  );
};

interface SelectedItemsProps {
  selectedItems: Content[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

const SelectedItems = ({
  selectedItems,
  onRemove,
  onClearAll,
}: SelectedItemsProps) => {
  if (selectedItems.length === 0) return null;

  return (
    <Box>
      <Group justify="space-between" align="center" mb="xs">
        <Text size="sm" fw={500}>
          Selected ({selectedItems.length})
        </Text>
        <Button variant="subtle" size="xs" color="gray" onClick={onClearAll}>
          Clear all
        </Button>
      </Group>
      <ScrollArea.Autosize mah={120}>
        <Group gap="xs">
          {selectedItems.map((item) => (
            <Chip
              key={item.id}
              checked={true}
              variant="filled"
              size="sm"
              color="blue"
              radius="sm"
              onChange={() => onRemove(item.id)}
            >
              <Group gap={4} wrap="nowrap">
                <Text size="xs" truncate style={{ maxWidth: 100 }}>
                  {item.name}
                </Text>
                <ActionIcon
                  size={14}
                  variant="transparent"
                  color="white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                >
                  <XIcon size={10} />
                </ActionIcon>
              </Group>
            </Chip>
          ))}
        </Group>
      </ScrollArea.Autosize>
    </Box>
  );
};

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  contentTypeFilter: string;
  onContentTypeChange: (value: string) => void;
  resultsCount: number;
  isLoading: boolean;
}

const SearchAndFilter = ({
  searchTerm,
  onSearchChange,
  contentTypeFilter,
  onContentTypeChange,
  resultsCount,
  isLoading,
}: SearchAndFilterProps) => {
  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Search content..."
        value={searchTerm}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        leftSection={<MagnifyingGlassIcon size={16} />}
        rightSection={
          searchTerm && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => onSearchChange("")}
            >
              <XIcon size={14} />
            </ActionIcon>
          )
        }
      />

      <Group justify="space-between" align="center">
        <SegmentedControl
          value={contentTypeFilter}
          onChange={onContentTypeChange}
          data={[
            { label: "All", value: "all" },
            ...CONTENT_TYPES.map((type) => ({
              label: type.label,
              value: type.value,
            })),
          ]}
          size="xs"
        />

        {!isLoading && (
          <Text size="xs" c="dimmed">
            {resultsCount} {resultsCount === 1 ? "item" : "items"} found
          </Text>
        )}
      </Group>
    </Stack>
  );
};

interface ContentSelectProps {
  contentType?: string;
  onCancel?: () => void;
  onComplete?: (selectedIds: string[]) => void;
}

export default function ContentSelect(props: ContentSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState(
    props.contentType || "all"
  );
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);

  const onSearchChangeDebounced = useDebouncedCallback(setSearchTerm, 300);

  const { data, fetchNextPage, isLoading, isFetchingNextPage } = useContents({
    search: searchTerm,
    page_size: 20,
    include_tags: false,
  });

  const contents = useMemo(() => {
    return (
      data?.pages
        ?.flatMap((page) => page.records)
        ?.filter((content) => {
          if (contentTypeFilter !== "all" && content.type !== contentTypeFilter)
            return false;
          return true;
        }) || []
    );
  }, [data?.pages, contentTypeFilter]);

  const selectedItems = useMemo(() => {
    return contents.filter((content) => localSelectedIds.includes(content.id));
  }, [contents, localSelectedIds]);

  const toggleSelection = (id: string) => {
    setLocalSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const removeFromSelection = (id: string) => {
    setLocalSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const clearAllSelection = () => {
    setLocalSelectedIds([]);
  };

  const handleComplete = () => {
    props.onComplete?.(localSelectedIds);
  };

  return (
    <Stack>
      <SearchAndFilter
        searchTerm={searchTerm}
        onSearchChange={onSearchChangeDebounced}
        contentTypeFilter={contentTypeFilter}
        onContentTypeChange={setContentTypeFilter}
        resultsCount={contents.length}
        isLoading={isLoading}
      />

      <SelectedItems
        selectedItems={selectedItems}
        onRemove={removeFromSelection}
        onClearAll={clearAllSelection}
      />

      {localSelectedIds.length > 0 && <Divider />}

      <RecordsList<Content>
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        records={contents}
        fetchNextPage={fetchNextPage}
        emptyState={
          searchTerm || contentTypeFilter !== "all"
            ? "No content matches your search criteria"
            : "No content available"
        }
        renderItem={(item) => (
          <ContentCard
            key={item.id}
            content={item}
            isSelected={localSelectedIds.includes(item.id)}
            onToggleSelect={toggleSelection}
          />
        )}
      />

      <FixedBottom
        isSubmitting={false}
        onSubmit={handleComplete}
        label={
          localSelectedIds.length === 0
            ? "Select content to continue"
            : `Add ${localSelectedIds.length} ${
                localSelectedIds.length === 1 ? "item" : "items"
              }`
        }
      />
    </Stack>
  );
}
