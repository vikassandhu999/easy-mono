import {humanizeError} from '@easy/error-parser';
import {Button, Modal, Surface} from '@heroui/react';
import {useRef} from 'react';

import {ClientInviteForm, ClientInviteFormHandle} from '@/components/ClientInviteForm';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {InviteClientProps, useInviteClient} from '@/services/clients';
import {notifyError} from '@/utils/notification';

const ClientInviteDrawer = () => {
  const {closeDrawer} = useParamsDrawer({});
  const [inviteClient] = useInviteClient();
  const formRef = useRef<ClientInviteFormHandle>(null);

  const handleInvite = async (values: InviteClientProps) => {
    try {
      await inviteClient(values).unwrap();
      closeDrawer();
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
      throw error;
    }
  };

  const handleSaveClick = async () => {
    await formRef.current?.submit();
  };

  return (
    <Modal>
      <Modal.Backdrop
        isDismissable
        isOpen
        onOpenChange={() => closeDrawer()}
      >
        <Modal.Container
          placement={'top'}
          scroll={'outside'}
          size={'lg'}
        >
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className={'text-xl font-semibold'}>Invite Client</Modal.Heading>
              <p className="text-sm leading-5 text-muted mb-2">
                Your client will receive an email invitation to join your coaching program.
              </p>
            </Modal.Header>
            <Modal.Body className="p-1">
              <Surface variant="default">
                <ClientInviteForm
                  onSubmit={handleInvite}
                  ref={formRef}
                />
              </Surface>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveClick}>Invite client</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default ClientInviteDrawer;
