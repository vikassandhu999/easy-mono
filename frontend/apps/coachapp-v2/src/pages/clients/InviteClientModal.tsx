import {Button, FieldError, Input, Label, Modal, Surface, TextField} from '@heroui/react';

import type {ClientInviteRequest} from '@/api/clients';

const INVITE_INPUT_CLASS =
  'border border-separator bg-background text-foreground ring-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

type InviteClientModalProps = {
  emailError?: string;
  formError: null | string;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onChange: (key: keyof ClientInviteRequest, value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  values: ClientInviteRequest;
};

export default function InviteClientModal({
  emailError,
  formError,
  isOpen,
  isSubmitting,
  onCancel,
  onChange,
  onOpenChange,
  onSubmit,
  values,
}: InviteClientModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Invite Client</Modal.Header>
            <Modal.Body className="p-2">
              <Surface variant="default">
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted">Send an invitation by email to add a client to your workspace.</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField isInvalid={Boolean(emailError)}>
                      <Label className="text-sm font-medium text-foreground">Email</Label>
                      <Input
                        className={INVITE_INPUT_CLASS}
                        onChange={(event) => onChange('email', event.target.value)}
                        placeholder="client@example.com"
                        type="email"
                        value={values.email}
                        variant="primary"
                      />
                      {emailError ? <FieldError>{emailError}</FieldError> : null}
                    </TextField>

                    <TextField>
                      <Label className="text-sm font-medium text-foreground">Phone</Label>
                      <Input
                        className={INVITE_INPUT_CLASS}
                        onChange={(event) => onChange('phone', event.target.value)}
                        placeholder="+1 555 123 4567"
                        value={values.phone}
                        variant="primary"
                      />
                    </TextField>

                    <TextField>
                      <Label className="text-sm font-medium text-foreground">First Name</Label>
                      <Input
                        className={INVITE_INPUT_CLASS}
                        onChange={(event) => onChange('first_name', event.target.value)}
                        placeholder="First name"
                        value={values.first_name}
                        variant="primary"
                      />
                    </TextField>

                    <TextField>
                      <Label className="text-sm font-medium text-foreground">Last Name</Label>
                      <Input
                        className={INVITE_INPUT_CLASS}
                        onChange={(event) => onChange('last_name', event.target.value)}
                        placeholder="Last name"
                        value={values.last_name}
                        variant="primary"
                      />
                    </TextField>
                  </div>

                  <TextField>
                    <Label className="text-sm font-medium text-foreground">Notes</Label>
                    <Input
                      className={INVITE_INPUT_CLASS}
                      onChange={(event) => onChange('notes', event.target.value)}
                      placeholder="Optional context for this client"
                      value={values.notes}
                      variant="primary"
                    />
                  </TextField>

                  {formError ? <p className="text-sm text-danger">{formError}</p> : null}
                </div>
              </Surface>
            </Modal.Body>
            <Modal.Footer>
              <Button className="min-h-11" onPress={onCancel} size="md" variant="ghost">
                Cancel
              </Button>
              <Button className="min-h-11" isDisabled={isSubmitting} onPress={onSubmit} size="md" variant="secondary">
                {isSubmitting ? 'Sending...' : 'Send Invite'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
