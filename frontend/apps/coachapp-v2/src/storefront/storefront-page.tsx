import {Spinner} from '@heroui/react';

import PageLayout from '@/@components/page-layout';
import {useListOffersQuery} from '@/api/offers';
import {useGetStoreProfileQuery} from '@/api/storefront';
import SharePanel from '@/storefront/components/share-panel';
import StorefrontPageForm from '@/storefront/components/storefront-page-form';

export default function StorefrontPage() {
  const {data, isError, isLoading} = useGetStoreProfileQuery();
  const {data: offersData} = useListOffersQuery();

  if (isLoading) {
    return (
      <PageLayout title="My Page">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="My Page">
        <div className="flex items-center justify-center rounded-xl border border-danger/20 bg-danger/5 px-4 py-12">
          <p className="text-sm text-danger">Failed to load profile.</p>
        </div>
      </PageLayout>
    );
  }

  // data.data can be null (no profile yet) or a StoreProfile object
  const profile = data?.data ?? null;
  const offers = offersData?.data ?? [];

  return (
    <PageLayout
      description="Edit your public profile and intake form"
      title="My Page"
    >
      <div className="flex max-w-2xl flex-col gap-10">
        <StorefrontPageForm profile={profile} />
        <SharePanel
          offers={offers}
          slug={profile?.slug ?? null}
        />
      </div>
    </PageLayout>
  );
}
