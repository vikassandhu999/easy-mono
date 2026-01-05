import {Alert, Box, ColorInput, Divider, Group, Loader, Paper, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {IconAlertCircle, IconPalette} from '@tabler/icons-react';
import {useState} from 'react';

import {useGetBusinessSettingsQuery, useUpdateBrandingSettingsMutation} from '@/services/settings/settings';

import classes from './BrandingSettings.module.css';

export default function BrandingSettings() {
  const {data: settings, isLoading, error} = useGetBusinessSettingsQuery();
  const [updateBranding, {isLoading: isUpdating}] = useUpdateBrandingSettingsMutation();

  // Local state for controlled inputs
  const [tagline, setTagline] = useState<string | undefined>(undefined);
  const [accentColor, setAccentColor] = useState<string | undefined>(undefined);
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(undefined);

  // Debounced save functions
  const debouncedSaveTagline = useDebouncedCallback(async (value: string) => {
    await updateBranding({tagline: value || null});
  }, 800);

  const debouncedSaveColor = useDebouncedCallback(async (value: string) => {
    await updateBranding({accent_color: value || null});
  }, 500);

  const debouncedSaveCoverImage = useDebouncedCallback(async (value: string) => {
    await updateBranding({cover_image_url: value || null});
  }, 800);

  const handleTaglineChange = (value: string) => {
    setTagline(value);
    debouncedSaveTagline(value);
  };

  const handleColorChange = (value: string) => {
    setAccentColor(value);
    debouncedSaveColor(value);
  };

  const handleCoverImageChange = (value: string) => {
    setCoverImageUrl(value);
    debouncedSaveCoverImage(value);
  };

  if (isLoading) {
    return (
      <Paper
        className={classes.container}
        p="md"
        radius="md"
        withBorder
      >
        <Group
          justify="center"
          py="xl"
        >
          <Loader size="sm" />
          <Text
            c="dimmed"
            size="sm"
          >
            Loading settings...
          </Text>
        </Group>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        className={classes.container}
        p="md"
        radius="md"
        withBorder
      >
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title="Error loading settings"
        >
          Could not load your branding settings. Please try again later.
        </Alert>
      </Paper>
    );
  }

  // Use local state if set, otherwise fall back to server data
  const currentTagline = tagline ?? settings?.tagline ?? '';
  const currentAccentColor = accentColor ?? settings?.accent_color ?? '';
  const currentCoverImageUrl = coverImageUrl ?? settings?.cover_image_url ?? '';

  return (
    <Paper
      className={classes.container}
      p="md"
      radius="md"
      withBorder
    >
      <Stack gap="md">
        {/* Header */}
        <Group gap="xs">
          <IconPalette size={20} />
          <Text
            fw={600}
            size="lg"
          >
            Public Page Branding
          </Text>
        </Group>

        <Text
          c="dimmed"
          size="sm"
        >
          Customize how your public join page looks to potential clients.
        </Text>

        <Divider />

        {/* Tagline */}
        <Box>
          <Text
            fw={500}
            mb="xs"
            size="sm"
          >
            Tagline
          </Text>
          <Textarea
            disabled={isUpdating}
            maxLength={255}
            maxRows={3}
            minRows={2}
            onChange={(e) => handleTaglineChange(e.target.value)}
            placeholder="e.g., Transform your fitness journey with personalized coaching"
            value={currentTagline}
          />
          <Text
            c="dimmed"
            mt={4}
            size="xs"
          >
            A short bio or welcome message shown on your public join page ({currentTagline.length}/255)
          </Text>
        </Box>

        <Divider />

        {/* Accent Color */}
        <Box>
          <Text
            fw={500}
            mb="xs"
            size="sm"
          >
            Accent Color
          </Text>
          <ColorInput
            disabled={isUpdating}
            format="hex"
            onChange={handleColorChange}
            placeholder="#3B82F6"
            swatches={[
              '#3B82F6', // Blue
              '#10B981', // Green
              '#8B5CF6', // Purple
              '#F59E0B', // Amber
              '#EF4444', // Red
              '#EC4899', // Pink
              '#06B6D4', // Cyan
              '#F97316', // Orange
            ]}
            value={currentAccentColor}
          />
          <Text
            c="dimmed"
            mt={4}
            size="xs"
          >
            Brand color used for buttons and accents on your public page
          </Text>
        </Box>

        <Divider />

        {/* Cover Image URL */}
        <Box>
          <Text
            fw={500}
            mb="xs"
            size="sm"
          >
            Cover Image URL
          </Text>
          <TextInput
            disabled={isUpdating}
            onChange={(e) => handleCoverImageChange(e.target.value)}
            placeholder="https://example.com/your-banner.jpg"
            value={currentCoverImageUrl}
          />
          <Text
            c="dimmed"
            mt={4}
            size="xs"
          >
            Banner image displayed at the top of your public join page (recommended: 1200x400px)
          </Text>
        </Box>

        {/* Preview hint */}
        {(currentTagline || currentAccentColor || currentCoverImageUrl) && (
          <>
            <Divider />
            <Box className={classes.previewHint}>
              <Text
                c="dimmed"
                size="xs"
                ta="center"
              >
                Changes are saved automatically. Visit your public join link to preview.
              </Text>
            </Box>
          </>
        )}
      </Stack>
    </Paper>
  );
}
