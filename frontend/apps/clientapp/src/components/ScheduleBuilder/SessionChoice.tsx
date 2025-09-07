import {
  Card,
  Group,
  Stack,
  TextInput,
  Text,
  Center,
  Box,
  Badge,
  ActionIcon,
} from "@mantine/core";
import PaddingContainer from "../Containers/PaddingContainer";
import { MagnifyingGlassIcon, BookOpenIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { SessionDef } from "@/Api/SessionDefs";
import { SESSION_TYPE_CONFIG } from "./sessionTypeConfig";
import { useSessionDefs } from "@/Hooks/useSessionDefsQueries";
import RecordsList from "../Layouts/RecordsList";

interface SessionDefCardProps {
  sessionDef: any;
  onSelect: (id: string) => void;
}

const SessionDefCard = ({ sessionDef, onSelect }: SessionDefCardProps) => {
  const typeConfig =
    SESSION_TYPE_CONFIG[
      sessionDef.session_type as keyof typeof SESSION_TYPE_CONFIG
    ] || SESSION_TYPE_CONFIG.other;
  const IconComponent = typeConfig.icon;

  return (
    <Card
      withBorder
      styles={{
        root: {
          cursor: "pointer",
          borderRadius: "var(--body-offset)",
          paddingTop: "var(--body-offset)",
          paddingInline: "var(--ce-size-md)",
          paddingBottom: "var(--ce-size-md)",
        },
      }}
      onClick={() => onSelect(sessionDef.id)}
      role="button"
      tabIndex={0}
      aria-label={`Select ${sessionDef.name}: ${
        sessionDef.description || typeConfig.description
      }`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(sessionDef.id);
        }
      }}
    >
      <Group gap="md" wrap="nowrap" align={"center"}>
        <Center
          w={40}
          h={40}
          style={{
            backgroundColor: typeConfig.color,
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          <IconComponent size={20} color={typeConfig.iconColor} />
        </Center>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text
            c={"dark"}
            style={{
              fontSize: "var(--body-font-size)",
              lineHeight: "var(--body-line-height)",
              color: "var(--mantine-color-gray-9)",
              fontWeight: 600,
              marginBottom: "var(--ce-size-xs)",
            }}
          >
            {sessionDef.name}
          </Text>
          {/* <Text
                        c={'dark'}
                        lineClamp={1}
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                            color: 'var(--mantine-color-gray-9)',
                            fontWeight: 400,
                            marginBottom: 'var(--ce-size-xs)',
                        }}
                    >
                        {sessionDef.description || typeConfig.description}
                    </Text> */}
          <Group gap="xs" wrap="wrap">
            <Badge
              variant="light"
              size={"md"}
              tt={"capitalize"}
              radius={"var(--body-offset)"}
            >
              {typeConfig.label}
            </Badge>
            {sessionDef.duration_minutes && (
              <Badge
                variant="light"
                size={"md"}
                tt={"capitalize"}
                radius={"var(--body-offset)"}
                fw={600}
              >
                {sessionDef.duration_minutes} min
              </Badge>
            )}
          </Group>
        </Box>
        <Center h={"100%"}>
          <ActionIcon
            variant="light"
            size={"md"}
            tt={"capitalize"}
            radius={"var(--body-offset)"}
          >
            <IconPlus size={16} />
          </ActionIcon>
        </Center>
      </Group>
    </Card>
  );
};

interface SessionChoiceProps {
  sessionType?: SessionDef["session_type"];
  onSelect: (id: string) => void;
  onCreateNew?: () => void;
}

const SessionChoice = ({
  onSelect,
  sessionType,
  onCreateNew,
}: SessionChoiceProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const onSearchChangeDebounced = useDebouncedCallback(setSearchTerm, 300);
  const { data, isLoading, fetchNextPage, isFetchingNextPage } = useSessionDefs(
    {
      search: searchTerm,
      session_type: sessionType,
    }
  );

  const sessionDefs = data?.pages.flatMap((page) => page.records) || [];

  return (
    <PaddingContainer>
      <Stack gap={"md"}>
        {onCreateNew && (
          <Card
            styles={{
              root: {
                border: "2px dashed var(--mantine-color-brand-3)",
                backgroundColor: "var(--mantine-color-brand-0)",
                cursor: "pointer",
                borderRadius: "var(--body-offset)",
                paddingTop: "var(--body-offset)",
                paddingInline: "var(--ce-size-md)",
                paddingBottom: "var(--ce-size-md)",
              },
            }}
            onClick={() => onCreateNew()}
            role="button"
            tabIndex={0}
            aria-label="Create new custom session"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCreateNew();
              }
            }}
          >
            <Group gap="md" wrap="nowrap" align="center">
              <Center
                w={40}
                h={40}
                style={{
                  backgroundColor: "var(--mantine-color-brand-2)",
                  borderRadius: 8,
                  flexShrink: 0,
                }}
              >
                <IconPlus size={20} color={"var(--mantine-color-brand-6)"} />
              </Center>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text
                  c={"dark"}
                  style={{
                    fontSize: "var(--body-font-size)",
                    lineHeight: "var(--body-line-height)",
                    color: "var(--mantine-color-gray-9)",
                    fontWeight: 600,
                  }}
                >
                  Create new {sessionType}
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
                  Define a custom {sessionType} with your own content
                </Text>
              </Box>
            </Group>
          </Card>
        )}

        <Box>
          <Text
            size={"sm"}
            fw={600}
            mb={"md"}
            style={{ color: "var(--mantine-color-gray-7)" }}
          >
            Or choose from existing library
          </Text>

          <Stack gap="md">
            {/* Mobile-First Search Bar */}
            <TextInput
              placeholder="Search sessions..."
              leftSection={
                <MagnifyingGlassIcon
                  size={18}
                  color="var(--mantine-color-gray-5)"
                />
              }
              onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
              size={"md"}
              styles={{
                input: {
                  borderColor: "var(--mantine-color-gray-3)",
                  "&:focus": {
                    borderColor: "var(--mantine-color-brand-5)",
                    boxShadow: "0 0 0 1px var(--mantine-color-brand-5)",
                  },
                },
              }}
            />

            <RecordsList
              isLoading={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              records={sessionDefs}
              fetchNextPage={fetchNextPage}
              emptyState={
                <Center py="xl">
                  <Stack gap="md" align="center" maw={320} ta="center">
                    <Box
                      w={48}
                      h={48}
                      style={{
                        backgroundColor: "var(--mantine-color-gray-1)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <BookOpenIcon
                        size={24}
                        color="var(--mantine-color-gray-5)"
                      />
                    </Box>
                    <Text
                      fw={600}
                      size="md"
                      style={{ color: "var(--mantine-color-gray-8)" }}
                    >
                      No sessions found
                    </Text>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
                      {searchTerm
                        ? `No sessions match "${searchTerm}"`
                        : "Create your first session to get started"}
                    </Text>
                  </Stack>
                </Center>
              }
              renderItem={(sessionDef) => {
                return (
                  <SessionDefCard
                    key={sessionDef.id}
                    sessionDef={sessionDef}
                    onSelect={onSelect}
                  />
                );
              }}
            />
          </Stack>
        </Box>
      </Stack>
    </PaddingContainer>
  );
};

export default SessionChoice;
