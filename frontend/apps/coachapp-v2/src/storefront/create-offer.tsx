import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
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
      applyFormErrors(err, "Offer wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Create offer</Page.Title>
          <Page.Description>Add a coaching offer to your storefront</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={() => navigate(ROUTES.STOREFRONT_OFFERS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Offers
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <OfferForm
          form={form}
          isSubmitting={isLoading}
          onCancel={() => navigate(ROUTES.STOREFRONT_OFFERS)}
          onSubmit={onSubmit}
          submitLabel="Create offer"
          submittingLabel="Creating offer"
        />
      </Page.Content>
    </Page>
  );
}
