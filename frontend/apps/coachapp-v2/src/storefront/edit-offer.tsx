import {AlertDialog, Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft, Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useDeleteOfferMutation, useGetOfferQuery, useUpdateOfferMutation} from '@/api/offers';
import {applyFormErrors} from '@/api/shared';
import OfferForm, {
  featuresToFormValues,
  formValuesToFeatures,
  type OfferFormValues,
  useOfferForm,
} from '@/storefront/components/offer-form';

function EditOfferForm({offerId}: {offerId: string}) {
  const navigate = useNavigate();
  const {data} = useGetOfferQuery(offerId);
  const [updateOffer, {isLoading: isUpdating}] = useUpdateOfferMutation();
  const [deleteOffer, {isLoading: isDeleting}] = useDeleteOfferMutation();

  const offer = data!.data;

  const form = useOfferForm({
    values: {
      cta_text: offer.cta_text ?? '',
      description: offer.description ?? '',
      duration_text: offer.duration_text ?? '',
      features: featuresToFormValues(offer.features ?? []),
      is_featured: offer.is_featured,
      name: offer.name,
      price_display: offer.price_display ?? '',
      type: offer.type ?? undefined,
    },
  });

  const onSubmit = async (formData: OfferFormValues) => {
    const features = formValuesToFeatures(formData.features);
    try {
      await updateOffer({
        body: {
          cta_text: formData.cta_text || undefined,
          description: formData.description || undefined,
          duration_text: formData.duration_text || undefined,
          features: features.length > 0 ? features : undefined,
          is_featured: formData.is_featured,
          name: formData.name,
          price_display: formData.price_display || undefined,
          type: formData.type || undefined,
        },
        id: offerId,
      }).unwrap();
      navigate(ROUTES.STOREFRONT_OFFERS);
    } catch (err) {
      applyFormErrors(err, "Offer wasn't updated. Check the details and try again", form.setError);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOffer(offerId).unwrap();
      navigate(ROUTES.STOREFRONT_OFFERS, {replace: true});
    } catch {
      // Error handled by RTK Query
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Edit offer</Page.Title>
          <Page.Description>{offer.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar className="flex items-center justify-between">
        <Button
          onPress={() => navigate(ROUTES.STOREFRONT_OFFERS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Offers
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
                  <AlertDialog.Heading>Delete offer?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <Typography>
                    This will permanently delete <strong>{offer.name}</strong>. This action cannot be undone.
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
        <OfferForm
          form={form}
          isSubmitting={isUpdating}
          onCancel={() => navigate(ROUTES.STOREFRONT_OFFERS)}
          onSubmit={onSubmit}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>
    </Page>
  );
}

export default function EditOffer() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading: isFetching} = useGetOfferQuery(id!);

  if (isFetching || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit offer</Page.Title>
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
            <Page.Title>Edit offer</Page.Title>
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
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Offer couldn't load
            </Typography>
          </div>
        </Page.Content>
      </Page>
    );
  }

  return <EditOfferForm offerId={id!} />;
}
