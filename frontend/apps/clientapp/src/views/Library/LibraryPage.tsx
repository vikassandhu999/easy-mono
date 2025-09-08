import HeadingContainer from "@/components/container/HeaderContainer";
import PaddingContainer from "@/components/container/PaddingContainer";
import PagePaper from "@/components/container/PagePaper";
import {
  Title,
  Text,
  Card,
  Group,
  Center,
  Box,
  Stack,
  ActionIcon,
} from "@mantine/core";
import { useNavigate } from "react-router";
import { CaretRightIcon } from "@phosphor-icons/react";
import { CONTENT_TYPES } from "@/Api/Contents";
import { useLocation } from "react-router";
// const ENABLED_SESSION_TYPES = ['workout', 'meal', 'measurement', 'check_in'] as const;

export default function LibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const onSelect = (value: string) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set("type", value);
    navigate(`/contents?${searchParams.toString()}`);
  };

  return (
    <PagePaper>
      <HeadingContainer
        withBorder={false}
        style={{
          paddingInline: "var(--ce-size-lg)",
          paddingBlock: "var(--ce-size-sm)",
        }}
      >
        <Stack gap="xs" style={{ flex: 1 }}>
          <Title order={5}>Library</Title>
          <Text
            c={"dark.6"}
            style={{
              fontSize: "var(--callout-font-size)",
              lineHeight: "var(--callout-line-height)",
              fontWeight: 400,
            }}
          >
            Manage and curate all exercises, foods, techniques, activities,
            guides, and lessons.
          </Text>
        </Stack>
      </HeadingContainer>
      <PaddingContainer
        paddingX={"lg"}
        paddingY={"md"}
        style={{ marginTop: "var(--ce-size-md)" }}
      >
        <Stack mb="md">
          {CONTENT_TYPES.map((key) => {
            const config = key;
            const IconComponent = config.icon;

            return (
              <Card
                key={config.value}
                withBorder
                style={{
                  cursor: "pointer",
                  borderRadius: "var(--body-offset)",
                  paddingTop: "var(--body-offset)",
                  paddingInline: "var(--ce-size-md)",
                  paddingBottom: "var(--ce-size-md)",
                }}
                onClick={() => onSelect(config.value)}
                role="button"
                tabIndex={0}
                aria-label={`Select ${config.label}: ${config.description}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(config.value);
                  }
                }}
              >
                <Group justify="space-between" align="center" wrap={"nowrap"}>
                  <Group
                    gap={"md"}
                    wrap={"nowrap"}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <Center
                      w={48}
                      h={48}
                      style={{
                        backgroundColor:
                          config.color || "var(--mantine-color-brand-1)",
                        borderRadius: 12,
                        flexShrink: 0,
                      }}
                    >
                      <IconComponent
                        size={24}
                        color={
                          config.iconColor || "var(--mantine-color-brand-6)"
                        }
                      />
                    </Center>
                    <Box style={{ flex: 1, minWidth: 0, gap: 0 }}>
                      <Text
                        c={"dark"}
                        style={{
                          fontSize: "var(--body-font-size)",
                          lineHeight: "var(--body-line-height)",
                          color: "var(--mantine-color-gray-9)",
                          fontWeight: 600,
                        }}
                      >
                        {config.label}
                      </Text>
                      <Text
                        c={"dark"}
                        style={{
                          fontSize: "var(--callout-font-size)",
                          lineHeight: "var(--callout-line-height)",
                          color: "var(--mantine-color-gray-9)",
                          fontWeight: 400,
                        }}
                      >
                        {config.description}
                      </Text>
                    </Box>
                  </Group>

                  <ActionIcon
                    variant={"subtle"}
                    color={"gray"}
                    size={"lg"}
                    style={{ flexShrink: 0 }}
                  >
                    <CaretRightIcon size={20} />
                  </ActionIcon>
                </Group>
              </Card>
            );
          })}
        </Stack>
      </PaddingContainer>
    </PagePaper>
  );
}
