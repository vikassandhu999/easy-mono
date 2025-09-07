import React, { useState, useEffect } from "react";
import {
  rem,
  Stack,
  TextInput,
  Textarea,
  Text,
  Badge,
  Group,
  Button,
  InputLabel,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  CreateContentProps,
  UpdateContentProps,
  Content,
  ContentType,
  InstructionsType,
} from "@/Api/Contents";
import PagePaper from "@/Components/Containers/PagePaper";
import PaddingContainer from "@/Components/Containers/PaddingContainer";
import { FixedBottom } from "../Containers/FixedBottom";
import { notifications } from "@mantine/notifications";
import { IconTarget } from "@tabler/icons-react";

// components
import { MetricsPicker } from "./MetricsPicker";
import { MediaDetails } from "./MediaDetails";
import { FormSection } from "@/Components/Containers/FormSection";
import { TagsSelector } from "@/Views/Tags/TagsSelector";
import { TagsPicker } from "@/Views/Tags/TagsPicker";
import { useDrawerStack } from "@/Providers/StackProvider";
import HeadingContainer from "../Containers/HeaderContainer";
import Header from "../Layouts/Header";
import { useSearchParams } from "react-router";

// Helper function for dynamic placeholders based on content type
const getPlaceholder = (type: string, field: "name" | "instructions") => {
  const placeholders = {
    exercise: {
      name: "Basic Jab Drill",
      instructions:
        "Clear steps & cues:\n1. Set stance...\n2. Perform 10 slow reps...",
    },
    food: {
      name: "Grilled Chicken (150g)",
      instructions:
        "Portion & prep notes:\n150g grilled chicken breast, medium heat...",
    },
    technique: {
      name: "Hip Hinge Technique",
      instructions: "Break down phases & key corrections...",
    },
    activity: {
      name: "Morning Walk 20min",
      instructions: "Describe routine & context...",
    },
    guide: {
      name: "Recovery Day Guide",
      instructions: "Outline key sections...",
    },
    lesson: {
      name: "Lesson 1: Foundations",
      instructions: "Learning objectives & outcomes...",
    },
  };
  return (
    placeholders[type as keyof typeof placeholders]?.[field] || "Enter text"
  );
};

interface ContentFormProps {
  mode: "create" | "edit";
  initialData?: Content | null;
  onSubmit: (data: CreateContentProps | UpdateContentProps) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

interface FormValues extends CreateContentProps {
  instructions_type?: InstructionsType;
}

export const ContentForm: React.FC<ContentFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [mediaType, setMediaType] = useState<string>("none");

  const [searchParams] = useSearchParams();

  const contentType = searchParams.get("type") as ContentType;

  console.log(contentType);

  const [metricsPickerOpened, setMetricsPickerOpened] = useState(false);
  const [tagsPickerOpened, setTagsPickerOpened] = useState(false);
  const stack = useDrawerStack();

  const theme = useMantineTheme();

  const form = useForm<FormValues>({
    initialValues: {
      type: initialData?.type || (contentType as ContentType) || "exercise",
      name: initialData?.name || "",
      instructions_type: (initialData as any)?.instructions_type || "text",
      instructions: initialData?.instructions || "",
      thumbnail_url: initialData?.thumbnail_url || "",
      media: initialData?.media || undefined,
      metric_keys: (initialData as any)?.metric_keys || [],
      tags: (initialData as any)?.tags || [],
    },
    validate: {
      name: (value) => {
        if (!value?.trim()) return "Content name is required";
        if (value.length > 100) return "Name must be 100 characters or less";
        return null;
      },
      instructions: (value, values) => {
        if (values.instructions_type !== "media") {
          if (!value?.trim()) return "Instructions are required";
          if (value.length > 2000)
            return "Instructions must be 2000 characters or less";
        }
        return null;
      },
      thumbnail_url: (value) => {
        if (value && !isValidUrl(value)) return "Please enter a valid URL";
        return null;
      },
    },
  });

  // Helper functions
  const isValidUrl = (urlString: string) => {
    try {
      return Boolean(new URL(urlString));
    } catch {
      return false;
    }
  };

  const parseVideoUrl = (url: string) => {
    // YouTube URL parsing
    const youtubeMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
    );
    if (youtubeMatch) {
      return { source: "youtube", external_id: youtubeMatch[1], url };
    }

    // Vimeo URL parsing
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return { source: "vimeo", external_id: vimeoMatch[1], url };
    }

    return { source: "direct", url, type: "video" };
  };

  const handleMediaUrlChange = (url: string) => {
    if (!url.trim()) {
      form.setFieldValue("media", undefined);
      return;
    }

    let mediaData;
    switch (mediaType) {
      case "video":
        mediaData = parseVideoUrl(url);
        break;
      case "image":
        mediaData = { type: "image", url };
        break;
      case "pdf":
        mediaData = {
          type: "document",
          url,
          mime_type: "application/pdf",
        };
        break;
      case "audio":
        mediaData = { type: "audio", url };
        break;
      case "link":
        mediaData = { type: "url", url };
        break;
      default:
        mediaData = undefined;
    }

    form.setFieldValue("media", mediaData);
  };

  const handleFormSubmit = (values: FormValues) => {
    if (form.validate().hasErrors) {
      notifications.show({
        title: "Validation Error",
        message: "Please fix the errors in the form",
        color: "red",
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    const submitData: CreateContentProps | UpdateContentProps = {
      type: values.type,
      name: values.name.trim(),
      instructions: values.instructions?.trim() || "",
      media: values.media,
      thumbnail_url: values.thumbnail_url || undefined,
      metric_keys: values.metric_keys?.length ? values.metric_keys : undefined,
      tags: values.tags?.length ? values.tags : undefined,
    };

    onSubmit(submitData);
  };

  // Initialize media type from existing data
  useEffect(() => {
    if (initialData?.media?.type) {
      const mediaData = initialData.media;
      if (
        mediaData.type === "document" &&
        mediaData.mime_type?.includes("pdf")
      ) {
        setMediaType("pdf");
      } else if (["video", "image", "audio"].includes(mediaData.type)) {
        setMediaType(mediaData.type);
      } else if (mediaData.type === "url") {
        setMediaType("link");
      }
    }
  }, [initialData]);

  return (
    <PagePaper>
      <HeadingContainer
        withBorder={false}
        style={{
          paddingInline: "var(--ce-size-xs)",
          paddingBlock: "var(--ce-size-md)",
          position: "sticky",
          top: 0,
        }}
      >
        <Header
          onBack={onCancel}
          title={
            mode === "create"
              ? `Create ${
                  form.values.type[0].toUpperCase() + form.values.type.slice(1)
                }`
              : form.values.name
          }
        />
      </HeadingContainer>

      <PaddingContainer>
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
          <FormSection>
            <TextInput
              label="Name"
              placeholder={getPlaceholder(form.values.type, "name")}
              required
              withAsterisk
              size={"md"}
              {...form.getInputProps("name")}
              description="Clear, specific name improves search & reuse"
            />

            <TagsSelector
              contentType={form.values.type}
              selectedTags={form.values.tags || []}
              onOpenTagsPicker={() => stack.open("tags-picker")}
            />
          </FormSection>

          {/* Essential Information - Progressive disclosure */}
          <FormSection>
            <Textarea
              label="Instructions"
              placeholder={getPlaceholder(form.values.type, "instructions")}
              required
              withAsterisk
              minRows={4}
              maxRows={8}
              autosize
              size={"lg"}
              {...form.getInputProps("instructions")}
              description="Concise, actionable steps. Use line breaks for clarity"
            />

            <MediaDetails
              selectedType={mediaType}
              onTypeChange={setMediaType}
              mediaValue={form.values.media}
              onMediaUrlChange={handleMediaUrlChange}
            />
          </FormSection>

          <FormSection>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <InputLabel
                  styles={{
                    label: {
                      fontSize: rem(14),
                      fontWeight: 600,
                      color: theme.colors.gray[8],
                      marginBottom: rem(4),
                    },
                  }}
                >
                  Metrics
                </InputLabel>
                <Button
                  variant="light"
                  size="sm"
                  leftSection={<IconTarget size={16} />}
                  onClick={() => stack.open("metrics-picker")}
                >
                  Manage Metrics
                </Button>
              </Group>
              {form.values.metric_keys && form.values.metric_keys.length > 0 ? (
                <Group gap="xs">
                  {form.values.metric_keys.map((metric) => (
                    <Badge key={metric} variant="light">
                      {metric}
                    </Badge>
                  ))}
                </Group>
              ) : (
                <Text size="sm" c="dimmed">
                  No metrics selected. Click "Manage Metrics" to add trackable
                  values.
                </Text>
              )}
            </Stack>
          </FormSection>

          <FormSection>
            <MetricsPicker
              opened={metricsPickerOpened}
              onClose={() => setMetricsPickerOpened(false)}
              value={form.values.metric_keys || []}
              onChange={(metrics) => form.setFieldValue("metric_keys", metrics)}
              contentType={form.values.type}
            />
          </FormSection>

          <TagsPicker
            opened={tagsPickerOpened}
            onClose={() => setTagsPickerOpened(false)}
            value={form.values.tags || []}
            onChange={(tags) => form.setFieldValue("tags", tags)}
            contentType={form.values.type}
          />
        </form>
      </PaddingContainer>

      <FixedBottom
        onSubmit={() => handleFormSubmit(form.values)}
        isSubmitting={isSubmitting}
        label={mode === "create" ? "Create Content" : "Update Content"}
      />
    </PagePaper>
  );
};
