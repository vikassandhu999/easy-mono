import {AlertDialog, Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft, Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {applyFormErrors} from '@/api/shared';
import {useDeleteTestimonialMutation, useGetTestimonialQuery, useUpdateTestimonialMutation} from '@/api/testimonials';
import TestimonialForm, {
  type TestimonialFormValues,
  testimonialToFormValues,
  testimonialToRequest,
  useTestimonialForm,
} from '@/storefront/testimonial-form/testimonial-form';

function EditTestimonialForm({testimonialId}: {testimonialId: string}) {
  const navigate = useNavigate();
  const {data} = useGetTestimonialQuery(testimonialId);
  const [updateTestimonial, {isLoading: isUpdating}] = useUpdateTestimonialMutation();
  const [deleteTestimonial, {isLoading: isDeleting}] = useDeleteTestimonialMutation();

  const testimonial = data!.data;

  const form = useTestimonialForm({
    values: testimonialToFormValues(testimonial),
  });

  const onSubmit = async (formData: TestimonialFormValues) => {
    try {
      await updateTestimonial({
        body: testimonialToRequest(formData),
        id: testimonialId,
      }).unwrap();
      navigate(ROUTES.STOREFRONT_TESTIMONIALS);
    } catch (err) {
      applyFormErrors(err, "Testimonial wasn't updated. Check the details and try again", form.setError);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTestimonial(testimonialId).unwrap();
      navigate(ROUTES.STOREFRONT_TESTIMONIALS, {replace: true});
    } catch {
      // Error handled by RTK Query
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Edit testimonial</Page.Title>
          <Page.Description>{testimonial.client_name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar className="flex items-center justify-between">
        <Button
          onPress={() => navigate(ROUTES.STOREFRONT_TESTIMONIALS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Testimonials
        </Button>

        <AlertDialog>
          <Button
            size="sm"
            variant="danger"
          >
            <Trash2 size={16} />
            Delete
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Delete testimonial?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <Typography>
                    This will permanently delete the testimonial from <strong>{testimonial.client_name}</strong>. This
                    action cannot be undone.
                  </Typography>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    slot="close"
                    variant="tertiary"
                  >
                    Cancel
                  </Button>
                  <Button
                    isPending={isDeleting}
                    onPress={handleDelete}
                    variant="danger"
                  >
                    {isDeleting ? 'Deleting' : 'Delete'}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </Page.Toolbar>

      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <TestimonialForm
          form={form}
          isSubmitting={isUpdating}
          onCancel={() => navigate(ROUTES.STOREFRONT_TESTIMONIALS)}
          onSubmit={onSubmit}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>
    </Page>
  );
}

export default function EditTestimonial() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading: isFetching} = useGetTestimonialQuery(id!);

  if (isFetching || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit testimonial</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit testimonial</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={() => navigate(ROUTES.STOREFRONT_TESTIMONIALS)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Testimonials
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Testimonial couldn't load
            </Typography>
          </div>
        </Page.Content>
      </Page>
    );
  }

  return <EditTestimonialForm testimonialId={id!} />;
}
