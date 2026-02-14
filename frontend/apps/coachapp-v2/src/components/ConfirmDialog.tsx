import { Button, Modal } from "@heroui/react";

type ConfirmDialogProps = {
  confirmLabel: string;
  description: string;
  isLoading?: boolean;
  isOpen: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  title: string;
};

export default function ConfirmDialog({
  confirmLabel,
  description,
  isLoading = false,
  isOpen,
  onConfirm,
  onOpenChange,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>{title}</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">{description}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="min-h-11"
                onPress={() => onOpenChange(false)}
                size="md"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                className="min-h-11"
                isDisabled={isLoading}
                onPress={onConfirm}
                size="md"
                variant="danger"
              >
                {isLoading ? "Deleting..." : confirmLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
