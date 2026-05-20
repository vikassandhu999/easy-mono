import {AlertDialog, Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft, Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {applyFormErrors} from '@/api/shared';
import {useDeleteTestimonialMutation, useGetTestimonialQuery, useUpdateTestimonialMutation} from '@/api/testimonials';
import TestimonialForm, {
  type TestimonialFormValues,
  useTestimonialForm,
} from '@/storefront/testimonial-form/testimonial-form';

function EditTestimonialForm({testimonialId}: {testimonialId: string}) {
  const navigate = useNavigate();
  const {data} = useGetTestimonialQuery(testimonialId);
  const [updateTestimonial, {isLoading: isUpdating}] = useUpdateTestimonialMutation();
  const [deleteTestimonial, {isLoading: isDeleting}] = useDeleteTestimonialMutation();

  const testimonial = data!.data;

  const form = useTestimonialForm({
    values: {
      after_image_url: testimonial.after_image_url ?? '',
      after_weight: testimonial.after_weight ? parseFloat(testimonial.after_weight) : undefined,
      before_image_url: testimonial.before_image_url ?? '',
      before_weight: testimonial.before_weight ? parseFloat(testimonial.before_weight) : undefined,
      client_handle: testimonial.client_handle ?? '',
      client_name: testimonial.client_name,
      duration_text: testimonial.duration_text ?? '',
      is_featured: testimonial.is_featured,
      program_name: testimonial.program_name ?? '',
      quote: testimonial.quote ?? '',
      rating: testimonial.rating ?? undefined,
      result_tag: testimonial.result_tag ?? '',
    },
  });

  const onSubmit = async (formData: TestimonialFormValues) => {
    try {
      await updateTestimonial({
        body: {
          after_image_url: formData.after_image_url || undefined,
          after_weight: formData.after_weight,
          before_image_url: formData.before_image_url || undefined,
          before_weight: formData.before_weight,
          client_handle: formData.client_handle || undefined,
          client_name: formData.client_name,
          duration_text: formData.duration_text || undefined,
          is_featured: formData.is_featured,
          program_name: formData.program_name || undefined,
          quote: formData.quote || undefined,
          rating: formData.rating,
          result_tag: formData.result_tag || undefined,
        },
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
