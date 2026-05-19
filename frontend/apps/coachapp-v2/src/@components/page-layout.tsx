import type {ReactNode} from 'react';

import {Page} from '@/@components/page';

interface PageLayoutProps {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  header?: ReactNode;
  title: string;
}

export default function PageLayout({action, children, description, header, title}: PageLayoutProps) {
  return (
    <Page>
      <div className="mb-6 flex shrink-0 flex-row items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        <div className="flex shrink-0 flex-row items-center justify-between gap-3">
          <Page.TitleGroup>
            <Page.Title>{title}</Page.Title>
            {description && <Page.Description>{description}</Page.Description>}
          </Page.TitleGroup>
          {action && <Page.Actions>{action}</Page.Actions>}
        </div>
        {header && <div className="shrink-0">{header}</div>}
      </div>
      <Page.Content>{children}</Page.Content>
    </Page>
  );
}
