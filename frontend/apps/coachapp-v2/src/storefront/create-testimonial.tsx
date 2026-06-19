import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {applyFormErrors} from '@/api/shared';
import {useCreateTestimonialMutation} from '@/api/testimonials';
import TestimonialForm, {
  type TestimonialFormValues,
  testimonialToRequest,
  useTestimonialForm,
} from '@/storefront/testimonial-form/testimonial-form';

export default function CreateTestimonial() {
  const navigate = useNavigate();
  const [createTestimonial, {isLoading}] = useCreateTestimonialMutation();
  const form = useTestimonialForm();

  const onSubmit = async (data: TestimonialFormValues) => {
    try {
      await createTestimonial(testimonialToRequest(data)).unwrap();
      navigate(ROUTES.STOREFRONT_TESTIMONIALS, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Testimonial wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Add testimonial</Page.Title>
          <Page.Description>Add a client result to your storefront</Page.Description>
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
        <TestimonialForm
          form={form}
          isSubmitting={isLoading}
          onCancel={() => navigate(ROUTES.STOREFRONT_TESTIMONIALS)}
          onSubmit={onSubmit}
          submitLabel="Save testimonial"
          submittingLabel="Saving testimonial"
        />
      </Page.Content>
    </Page>
  );
}
