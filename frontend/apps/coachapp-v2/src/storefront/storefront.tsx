import {Link} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';

interface StorefrontSection {
  description: string;
  label: string;
  path: string;
}

const SECTIONS: StorefrontSection[] = [
  {
    description: 'Edit your public profile, slug, bio, and intake form',
    label: 'My Page',
    path: ROUTES.STOREFRONT_PAGE,
  },
  {
    description: 'Manage your coaching offers and pricing',
    label: 'Offers',
    path: ROUTES.STOREFRONT_OFFERS,
  },
  {
    description: 'Showcase client results and testimonials',
    label: 'Testimonials',
    path: ROUTES.STOREFRONT_TESTIMONIALS,
  },
];

export default function Storefront() {
  return (
    <PageLayout
      description="Your public page, offers, and testimonials"
      title="Storefront"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            className="flex min-h-11 flex-col gap-1 rounded-xl border border-divider bg-content1 p-4 transition-colors hover:bg-content2 active:bg-content2"
            key={section.path}
            to={section.path}
          >
            <span className="text-sm font-semibold">{section.label}</span>
            <span className="text-xs text-foreground-500">{section.description}</span>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
