import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {applyFormErrors} from '@/api/shared';
import {useCreateTestimonialMutation} from '@/api/testimonials';
import TestimonialForm, {
  type TestimonialFormValues,
  useTestimonialForm,
} from '@/storefront/components/testimonial-form';

export default function CreateTestimonial() {
  const navigate = useNavigate();
  const [createTestimonial, {isLoading}] = useCreateTestimonialMutation();
  const form = useTestimonialForm();

  const onSubmit = async (data: TestimonialFormValues) => {
    const beforeWeight =
      typeof data.before_weight === 'number' && !isNaN(data.before_weight) ? data.before_weight : undefined;
    const afterWeight =
      typeof data.after_weight === 'number' && !isNaN(data.after_weight) ? data.after_weight : undefined;

    try {
      await createTestimonial({
        after_image_url: data.after_image_url || undefined,
        after_weight: afterWeight,
        before_image_url: data.before_image_url || undefined,
        before_weight: beforeWeight,
        client_handle: data.client_handle || undefined,
        client_name: data.client_name,
        duration_text: data.duration_text || undefined,
        is_featured: data.is_featured,
        program_name: data.program_name || undefined,
        quote: data.quote || undefined,
        rating: data.rating,
        result_tag: data.result_tag || undefined,
      }).unwrap();
      navigate(ROUTES.STOREFRONT_TESTIMONIALS, {replace: true});
    } catch (err) {
      applyFormErrors(err, 'Failed to create testimonial. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description="Add a client result or testimonial."
      title="Add Testimonial"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(ROUTES.STOREFRONT_TESTIMONIALS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Testimonials
        </Button>
      </div>

      <TestimonialForm
        form={form}
        isSubmitting={isLoading}
        onCancel={() => navigate(ROUTES.STOREFRONT_TESTIMONIALS)}
        onSubmit={onSubmit}
        submitLabel="Save Testimonial"
        submittingLabel="Saving..."
      />
    </PageLayout>
  );
}
