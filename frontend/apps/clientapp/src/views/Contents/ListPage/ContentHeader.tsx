import { Button, Stack, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { PlusIcon } from "@phosphor-icons/react";
import HeadingContainer from "@/Components/Containers/HeaderContainer";
import React from "react";
import Header from "@/Components/Layouts/Header";
import { useNavigate } from "react-router";

type ContentHeaderProps = {
  onSearchChange?: (search: string) => void;
  onCreateContent?: () => void;
  totalContents?: number;
  isLoading?: boolean;
  title?: string;
  ref?: React.Ref<HTMLDivElement>;
};

export default function ContentHeader({
  onSearchChange,
  onCreateContent,
  title,
  ref,
}: ContentHeaderProps) {
  const navigate = useNavigate();
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
        <Header
          title={title || "Programs"}
          onBack={() => navigate(-1)}
          actions={
            <Button
              size={"sm"}
              radius={9999}
              onClick={onCreateContent}
              leftSection={<PlusIcon size={18} />}
            >
              Create
            </Button>
          }
        />

        <TextInput
          placeholder="Search contents..."
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
