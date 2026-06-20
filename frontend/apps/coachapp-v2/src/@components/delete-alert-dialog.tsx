import {AlertDialog, Button, UseOverlayStateReturn} from '@heroui/react';
import {ReactNode} from 'react';

type Props = {
  state: UseOverlayStateReturn;
  heading: ReactNode;
  description: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteAlertDialog({state, onConfirm, onCancel, ...props}: Props) {
  return (
    <AlertDialog.Backdrop
      isOpen={state.isOpen}
      onOpenChange={state.setOpen}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-100">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>{props.heading}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>{props.description}</AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              onPress={onCancel}
              slot="close"
              variant="tertiary"
            >
              {props.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              onPress={onConfirm}
              slot="close"
              variant="danger"
            >
              {props.confirmLabel ?? 'Delete Project'}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
