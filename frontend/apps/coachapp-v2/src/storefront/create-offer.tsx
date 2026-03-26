import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useCreateOfferMutation} from '@/api/offers';
import {applyFormErrors} from '@/api/shared';
import OfferForm, {formValuesToFeatures, type OfferFormValues, useOfferForm} from '@/storefront/components/offer-form';

export default function CreateOffer() {
  const navigate = useNavigate();
  const [createOffer, {isLoading}] = useCreateOfferMutation();
  const form = useOfferForm();

  const onSubmit = async (data: OfferFormValues) => {
    const features = formValuesToFeatures(data.features);
    try {
      const result = await createOffer({
        cta_text: data.cta_text || undefined,
        description: data.description || undefined,
        duration_text: data.duration_text || undefined,
        features: features.length > 0 ? features : undefined,
        is_featured: data.is_featured,
        name: data.name,
        price_display: data.price_display || undefined,
        type: data.type || undefined,
      }).unwrap();
      navigate(`/storefront/offers/${result.data.id}/edit`, {replace: true});
    } catch (err) {
      applyFormErrors(err, 'Failed to create offer. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description="Add a new coaching offer to your storefront."
      title="Create Offer"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(ROUTES.STOREFRONT_OFFERS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Offers
        </Button>
      </div>

      <OfferForm
        form={form}
        isSubmitting={isLoading}
        onCancel={() => navigate(ROUTES.STOREFRONT_OFFERS)}
        onSubmit={onSubmit}
        submitLabel="Create Offer"
        submittingLabel="Creating..."
      />
    </PageLayout>
  );
}
