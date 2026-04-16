import {Button, toast} from '@heroui/react';
import {Camera, Plus, TrendingUp} from 'lucide-react';

import PageLayout from '@/@components/page-layout';
import SectionHeading from '@/@components/section-heading';

// ── Weight section ────────────────────────────────────────────────

function WeightSection() {
  // TODO: replace with real data + chart once weight log API ships
  const handleLogWeight = () => {
    toast.info('Weight logging coming soon');
  };

  return (
    <section className="mb-6">
      <SectionHeading title="Weight" />
      <div className="rounded-xl border border-divider bg-content1 p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <TrendingUp
            className="text-primary"
            size={24}
          />
        </div>
        <h3 className="text-base font-medium">Start tracking your weight</h3>
        <p className="mt-2 text-sm text-foreground-500">Log your weight regularly to see your progress.</p>
        <Button
          className="mt-4"
          onPress={handleLogWeight}
          variant="primary"
        >
          <Plus size={16} />
          Log first weight
        </Button>
      </div>
    </section>
  );
}

// ── Photos section ────────────────────────────────────────────────

function PhotosSection() {
  // TODO: replace with real photo grid + compare flow once photo API ships
  const handleAddPhoto = () => {
    toast.info('Progress photos coming soon');
  };

  return (
    <section>
      <SectionHeading title="Photos" />
      <div className="rounded-xl border border-divider bg-content1 p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent/10">
          <Camera
            className="text-accent"
            size={24}
          />
        </div>
        <h3 className="text-base font-medium">Take your first progress photo</h3>
        <p className="mt-2 text-sm text-foreground-500">
          Front, side, and back shots help your coach see your progress.
        </p>
        <Button
          className="mt-4"
          onPress={handleAddPhoto}
          variant="primary"
        >
          <Plus size={16} />
          Add photo
        </Button>
      </div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function ProgressHome() {
  return (
    <PageLayout title="Progress">
      <div className="max-w-lg">
        <WeightSection />
        <PhotosSection />
      </div>
    </PageLayout>
  );
}
