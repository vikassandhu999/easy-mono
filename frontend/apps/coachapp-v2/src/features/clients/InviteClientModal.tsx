import {Button, FieldError, Input, Label, Modal, Surface, TextField, toast} from '@heroui/react';
import {useState} from 'react';

import type {ClientInviteRequest} from '@/entities/clients/api/clients';

import {useInviteClientMutation} from '@/entities/clients/api/clients';
import {handleFormError} from '@/shared/api/shared';

const INVITE_INPUT_CLASS =
  'border border-separator bg-background text-foreground ring-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

type InviteClientModalProps = {
  isOpen: boolean;
  onInvited: () => void;
  onOpenChange: (open: boolean) => void;
};

const INITIAL_VALUES: ClientInviteRequest = {
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  notes: '',
};

export default function InviteClientModal({isOpen, onInvited, onOpenChange}: InviteClientModalProps) {
  const [values, setValues] = useState<ClientInviteRequest>(INITIAL_VALUES);
  const [formError, setFormError] = useState<null | string>(null);
  const [fieldErrors, setFieldErrors] = useState<null | Record<string, string[]>>(null);
  const [inviteClient, {isLoading: isInviting}] = useInviteClientMutation();

  const emailError = fieldErrors?.email?.[0];

  const resetForm = () => {
    setValues(INITIAL_VALUES);
    setFormError(null);
    setFieldErrors(null);
  };

  const handleChange = (key: keyof ClientInviteRequest, value: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSubmit = async () => {
    setFormError(null);
    setFieldErrors(null);

    if (!values.email) {
      setFieldErrors({email: ['Email is required.']});
      return;
    }

    try {
      await inviteClient({
        email: values.email,
        first_name: values.first_name?.trim() || undefined,
        last_name: values.last_name?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      }).unwrap();
      toast.success('Client invited successfully.');
      onInvited();
      handleClose();
    } catch (err) {
      const result = handleFormError(err, 'Unable to invite client. Please try again.');
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
      if (!result.fieldErrors) {
        toast.danger(result.formError);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          resetForm();
        }
      }}
    >
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
                        onChange={(event) => handleChange('email', event.target.value)}
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
                        onChange={(event) => handleChange('phone', event.target.value)}
                        placeholder="+1 555 123 4567"
                        value={values.phone}
                        variant="primary"
                      />
                    </TextField>

                    <TextField>
                      <Label className="text-sm font-medium text-foreground">First Name</Label>
                      <Input
                        className={INVITE_INPUT_CLASS}
                        onChange={(event) => handleChange('first_name', event.target.value)}
                        placeholder="First name"
                        value={values.first_name}
                        variant="primary"
                      />
                    </TextField>

                    <TextField>
                      <Label className="text-sm font-medium text-foreground">Last Name</Label>
                      <Input
                        className={INVITE_INPUT_CLASS}
                        onChange={(event) => handleChange('last_name', event.target.value)}
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
                      onChange={(event) => handleChange('notes', event.target.value)}
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
              <Button
                className="min-h-11"
                onPress={handleClose}
                size="md"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                className="min-h-11"
                isDisabled={isInviting}
                onPress={handleSubmit}
                size="md"
                variant="secondary"
              >
                {isInviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
