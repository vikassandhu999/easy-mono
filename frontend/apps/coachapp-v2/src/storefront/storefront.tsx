import {Typography} from '@heroui/react';
import {Link} from 'react-router-dom';

import {Page} from '@/@components/page';
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
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Storefront</Page.Title>
          <Page.Description>Your public page, offers, and testimonials</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link
              className="flex min-h-11 flex-col gap-1 rounded-xl border border-divider bg-content1 p-4 transition-colors hover:bg-content2 active:bg-content2"
              key={section.path}
              to={section.path}
            >
              <Typography
                type="body-sm"
                weight="semibold"
              >
                {section.label}
              </Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                {section.description}
              </Typography>
            </Link>
          ))}
        </div>
      </Page.Content>
    </Page>
  );
}
