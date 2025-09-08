import { Button, Group, Stack, TextInput, Title } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { PlusIcon } from "@phosphor-icons/react";
import { ProgramCreateWithTrigger } from "@/Components/ProgramCreateWithTrigger/ProgramCreateWithTrigger";
import HeadingContainer from "@/components/container/HeaderContainer";
import React from "react";

type ProgramsPageProps = {
  onSearchChange?: (search: string) => void;
  totalPrograms?: number;
  isLoading?: boolean;
  ref?: React.Ref<HTMLDivElement>;
};

export default function Header({ onSearchChange, ref }: ProgramsPageProps) {
  const onSearchChangeDebounced = useDebouncedCallback(onSearchChange, 300);

  return (
    <HeadingContainer
      ref={ref}
      withBorder={false}
      style={{
        paddingInline: "var(--ce-size-lg)",
        paddingBlock: "var(--ce-size-sm)",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="start" wrap="nowrap" w="100%">
          <Stack gap="0" style={{ flex: 1 }}>
            <Title order={5}>Programs</Title>
          </Stack>
          <ProgramCreateWithTrigger>
            {({ onClick }) => (
              <Button
                size={"sm"}
                radius={9999}
                onClick={onClick}
                leftSection={<PlusIcon size={18} />}
              >
                Create
              </Button>
            )}
          </ProgramCreateWithTrigger>
        </Group>

        <TextInput
          placeholder="Search programs..."
          // leftSection={<MagnifyingGlassIcon size={18} />}
          onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
          size={"md"}
          styles={{
            root: { flex: 1 },
            input: {
              borderRadius: "var(--body-offset)",
            },
          }}
        />
      </Stack>
    </HeadingContainer>
  );
}
