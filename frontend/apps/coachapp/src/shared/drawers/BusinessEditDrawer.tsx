import {humanizeError} from '@easy/error-parser';
import {Button, FieldError, Input, Label, Modal, Spinner, Surface, TextArea, TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {
  BusinessUpdateForm_zod,
  BusinessUpdateFormValues,
  useGetMyBusinessQuery,
  useUpdateMyBusinessMutation,
} from '@/services/business';
import {notifyError, notifySuccess} from '@/utils/notification';

const BusinessEditDrawer = () => {
  const {closeDrawer} = useParamsDrawer({});

  const {data: business, isLoading: isLoadingBusiness} = useGetMyBusinessQuery();
  const [updateBusiness, {isLoading: isUpdating}] = useUpdateMyBusinessMutation();

  const {control, handleSubmit, reset} = useForm<BusinessUpdateFormValues>({
    defaultValues: {
      name: '',
      about: '',
    },
    resolver: zodResolver(BusinessUpdateForm_zod),
  });

  useEffect(() => {
    if (business) {
      reset({
        name: business.name || '',
        about: business.about || '',
      });
    }
  }, [business, reset]);

  const handleFormSubmit = async (values: BusinessUpdateFormValues) => {
    try {
      const payload = {
        name: values.name,
        about: values.about === '' ? undefined : (values.about ?? undefined),
      };

      await updateBusiness(payload).unwrap();
      notifySuccess('Business updated successfully');
      closeDrawer();
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
    }
  };

  if (isLoadingBusiness) {
    return (
      <Modal>
        <Modal.Backdrop
          isDismissable
          isOpen
          onOpenChange={() => closeDrawer()}
        >
          <Modal.Container
            placement="top"
            scroll="outside"
            size="lg"
          >
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className="text-xl font-semibold">Edit Business Profile</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <Spinner />
                  <p className="text-sm text-default-500">Loading business...</p>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  if (!business) {
    return (
      <Modal>
        <Modal.Backdrop
          isDismissable
          isOpen
          onOpenChange={() => closeDrawer()}
        >
          <Modal.Container
            placement="top"
            scroll="outside"
            size="lg"
          >
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className="text-xl font-semibold">Edit Business Profile</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="py-4 text-sm text-danger-600">Business not found</p>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  return (
    <Modal>
      <Modal.Backdrop
        isDismissable
        isOpen
        onOpenChange={() => closeDrawer()}
      >
        <Modal.Container
          placement="top"
          scroll="outside"
          size="lg"
        >
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="text-xl font-semibold">Edit Business Profile</Modal.Heading>
              {business.handle && <p className="text-sm text-default-400">@{business.handle}</p>}
            </Modal.Header>
            <Modal.Body className="p-1">
              <Surface variant="default">
                <form
                  className="flex flex-col gap-6 p-4"
                  onSubmit={handleSubmit(handleFormSubmit)}
                >
                  {/* Business Name */}
                  <Controller
                    control={control}
                    name="name"
                    render={({field, fieldState}) => (
                      <TextField
                        {...field}
                        isInvalid={fieldState.invalid}
                        isRequired
                      >
                        <Label className="text-sm font-medium">Business Name</Label>
                        <Input placeholder="e.g., FitIndia Coaching" />
                        {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />

                  {/* About */}
                  <Controller
                    control={control}
                    name="about"
                    render={({field, fieldState}) => (
                      <TextField
                        {...field}
                        isInvalid={fieldState.invalid}
                        value={field.value ?? ''}
                      >
                        <Label className="text-sm font-medium">About</Label>
                        <TextArea
                          placeholder="Tell clients about your business..."
                          rows={4}
                        />
                        {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />
                </form>
              </Surface>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                isDisabled={isUpdating}
                onPress={() => handleSubmit(handleFormSubmit)()}
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default BusinessEditDrawer;
