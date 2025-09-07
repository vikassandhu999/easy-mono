import React from "react";
import { Button, Box, useMantineTheme } from "@mantine/core";
import { useKeyboardVisible } from "@/Hooks/useKeyboardVisible";
import PaddingContainer from "./PaddingContainer";

interface Props {
  isSubmitting?: boolean;
  onSubmit?: () => void;
  label?: string;
}

export const FixedBottom: React.FC<Props> = ({
  label,
  onSubmit,
  isSubmitting = false,
}) => {
  const theme = useMantineTheme();
  const isKeyboardVisible = useKeyboardVisible();

  return (
    <Box
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        borderTop: `1px solid ${theme.colors.gray[3]}`,
        padding: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        boxShadow: theme.shadows.xs,
        zIndex: 900,
        display: isKeyboardVisible ? "none" : "block",
        paddingBottom: `env(safe-area-inset-bottom)`,
      }}
    >
      <PaddingContainer>
        <Button
          fullWidth
          onClick={onSubmit}
          loading={isSubmitting}
          size={"lg"}
          radius={9999}
          type={onSubmit ? "button" : "submit"}
        >
          {label}
        </Button>
      </PaddingContainer>
    </Box>
  );
};
