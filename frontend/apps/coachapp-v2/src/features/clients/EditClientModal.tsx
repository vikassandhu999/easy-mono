import {Button, Input, Label, Modal, Surface, TextField, toast} from '@heroui/react';
import {useState} from 'react';

import type {Client, ClientUpdateRequest} from '@/entities/clients/api/clients';

import {useUpdateClientMutation} from '@/entities/clients/api/clients';
import {handleFormError} from '@/shared/api/shared';

type EditClientModalProps = {
  client: Client;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const INPUT_CLASS =
  'border border-separator bg-background text-foreground ring-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

export default function EditClientModal({client, isOpen, onOpenChange}: EditClientModalProps) {
  const [values, setValues] = useState<ClientUpdateRequest>({
    first_name: client.first_name ?? '',
    last_name: client.last_name ?? '',
    notes: client.notes ?? '',
    phone: client.phone ?? '',
    status: client.status,
  });
  const [formError, setFormError] = useState<null | string>(null);
  const [updateClient, {isLoading}] = useUpdateClientMutation();

  const resetForm = () => {
    setValues({
      first_name: client.first_name ?? '',
      last_name: client.last_name ?? '',
      notes: client.notes ?? '',
      phone: client.phone ?? '',
      status: client.status,
    });
    setFormError(null);
  };

  const handleChange = (key: keyof ClientUpdateRequest, value: string) => {
    setValues((prev) => ({...prev, [key]: value}));
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSubmit = async () => {
    setFormError(null);
    updateClient({
      body: {
        first_name: values.first_name?.trim() || undefined,
        last_name: values.last_name?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        status: values.status || undefined,
      },
      id: client.id,
    })
      .unwrap()
      .then(() => {
        toast.success('Client updated successfully.');
        handleClose();
      })
      .catch((err) => {
        const result = handleFormError(err, 'Unable to update client. Please try again.');
        setFormError(result.formError);
        toast.danger(result.formError);
      });
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Edit client</Modal.Header>
            <Modal.Body className="p-2">
              <Surface variant="default">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField>
                      <Label className="text-sm font-medium text-foreground">First name</Label>
                      <Input
                        className={INPUT_CLASS}
                        onChange={(e) => handleChange('first_name', e.target.value)}
                        placeholder="First name…"
                        value={values.first_name}
                        variant="primary"
                      />
                    </TextField>
                    <TextField>
                      <Label className="text-sm font-medium text-foreground">Last name</Label>
                      <Input
                        className={INPUT_CLASS}
                        onChange={(e) => handleChange('last_name', e.target.value)}
                        placeholder="Last name…"
                        value={values.last_name}
                        variant="primary"
                      />
                    </TextField>
                  </div>

                  <TextField>
                    <Label className="text-sm font-medium text-foreground">Phone</Label>
                    <Input
                      className={INPUT_CLASS}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+1 555 123 4567"
                      value={values.phone}
                      variant="primary"
                    />
                  </TextField>

                  <TextField>
                    <Label className="text-sm font-medium text-foreground">Notes</Label>
                    <Input
                      className={INPUT_CLASS}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder="Notes about this client…"
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
                isDisabled={isLoading}
                onPress={handleSubmit}
                size="md"
                variant="secondary"
              >
                {isLoading ? 'Saving…' : 'Save changes'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
