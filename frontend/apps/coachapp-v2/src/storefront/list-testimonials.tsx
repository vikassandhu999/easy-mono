import {Button} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import InfiniteList from '@/@components/infinite-list';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {type Testimonial, useTestimonialsInfiniteQuery} from '@/api/testimonials';
import TestimonialCard from '@/storefront/components/testimonial-card';

export default function ListTestimonials() {
  const navigate = useNavigate();

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useTestimonialsInfiniteQuery();

  const testimonials = useMemo<Testimonial[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const {sentinelRef} = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  return (
    <PageLayout
      action={
        <Button
          onPress={() => navigate(ROUTES.CREATE_TESTIMONIAL)}
          size="sm"
        >
          <Plus size={16} />
          Add
        </Button>
      }
      title="Testimonials"
    >
      <Button
        className="mb-4"
        onPress={() => navigate(ROUTES.STOREFRONT)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft size={16} />
        Storefront
      </Button>

      <InfiniteList
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm font-medium text-foreground-500">No testimonials yet</p>
            <p className="text-xs text-foreground-400">
              Add client results and testimonials to showcase on your storefront.
            </p>
            <Button
              className="mt-3"
              onPress={() => navigate(ROUTES.CREATE_TESTIMONIAL)}
              size="sm"
            >
              <Plus size={16} />
              Add Testimonial
            </Button>
          </div>
        }
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        items={testimonials}
        keyExtractor={(t) => t.id}
        renderItem={(t) => <TestimonialCard testimonial={t} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
