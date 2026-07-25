import {Surface} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ReactNode, UIEvent} from 'react';
import {useState} from 'react';

interface PageProps {
  children: ReactNode;
  className?: string;
}

type PageSize = 'content' | 'wide';

interface PageLayoutProps extends PageProps {
  size?: PageSize;
}

// One content width for every read/write screen — lists, forms and detail views
// all sit in the same column so navigating between them doesn't jump. `wide` is
// only for the two plan builders and the dashboard grid.
const PAGE_SIZE_CLASS: Record<PageSize, string> = {
  content: 'mx-auto max-w-5xl',
  wide: 'mx-auto max-w-6xl',
};

const PAGE_GUTTER_CLASS = 'w-full px-4 md:px-6 lg:px-8';

interface PageTitleProps {
  children: ReactNode;
  className?: string;
  testId?: string;
}

interface PageDescriptionProps {
  children: ReactNode;
  className?: string;
  testId?: string;
}

function PageRoot({children, className}: PageProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    setIsScrolled(event.currentTarget.scrollTop > 0);
  }

  return (
    <Surface
      className={cn('easy_page relative z-0 mr-0 ml-0 block flex-1 bg-background', className)}
      data-scrollbar="thin"
    >
      <div
        className="easy_main-content group/page absolute inset-0 flex flex-col overflow-y-auto scrollbar"
        data-scrolled={isScrolled}
        onScroll={handleScroll}
      >
        {children}
      </div>
    </Surface>
  );
}

function PageHeader({children, className, size = 'wide'}: PageLayoutProps) {
  return (
    <div
      className={cn(
        PAGE_GUTTER_CLASS,
        PAGE_SIZE_CLASS[size],
        'flex shrink-0 flex-row items-center justify-between gap-3 pt-4 pb-2 md:pt-6 lg:pt-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

function PageTitleGroup({children, className}: PageProps) {
  return <div className={cn('min-w-0 flex-1', className)}>{children}</div>;
}

function PageTitle({children, className, testId}: PageTitleProps) {
  return (
    <span
      className={cn(
        // 22 on mobile, 27 from `sm` — which is what the scale itself declares:
        // `--type-metric` is "mobile page titles", `--type-display` is "desktop +
        // builder page titles". The `sm:` half used to repeat `type-metric`, a
        // responsive pair with the same token on both sides, so EVERY page title
        // in the app rendered 22px at every width. A duplicated `sm:` is never a
        // decision — it is the fossil of a step someone meant to add.
        'block min-w-0 truncate font-grotesk type-metric font-semibold tracking-name [color:var(--color-foreground)]',
        'sm:type-display sm:tracking-page',
        className,
      )}
      data-testid={testId}
    >
      {children}
    </span>
  );
}

function PageDescription({children, className, testId}: PageDescriptionProps) {
  return (
    <span
      className={cn('mt-1 block type-body leading-[normal] [color:var(--color-muted)]', className)}
      data-testid={testId}
    >
      {children}
    </span>
  );
}

function PageActions({children, className}: PageProps) {
  return <div className={cn('flex shrink-0 items-center gap-2', className)}>{children}</div>;
}

function PageToolbar({children, className, size = 'wide'}: PageLayoutProps) {
  return <div className={cn(PAGE_GUTTER_CLASS, PAGE_SIZE_CLASS[size], 'mb-6 shrink-0', className)}>{children}</div>;
}

function PageFrame({children, className, size = 'wide'}: PageLayoutProps) {
  return <div className={cn(PAGE_GUTTER_CLASS, PAGE_SIZE_CLASS[size], className)}>{children}</div>;
}

// Owns the page gutter like its Header/Toolbar/Frame siblings, so content stays
// aligned with the header above it without every screen restating the gutter.
// Screens that nest a Page.Frame (which applies its own gutter) pass `bare`.
// flex-1 stretches short pages to the viewport (so mt-auto footers pin to the
// bottom) but deliberately NO min-h-0: min-height:auto floors this at its
// content height, which is what lets long lists overflow the scroll container.
// min-h-0 here turns the page into a viewport-clamped pane — nothing scrolls
// and infinite lists never load page two.
function PageContent({bare, children, className}: PageProps & {bare?: boolean}) {
  return <div className={cn('flex flex-1 flex-col', bare ? undefined : PAGE_GUTTER_CLASS, className)}>{children}</div>;
}

export const Page = Object.assign(PageRoot, {
  Actions: PageActions,
  Content: PageContent,
  Description: PageDescription,
  Frame: PageFrame,
  Header: PageHeader,
  Title: PageTitle,
  TitleGroup: PageTitleGroup,
  Toolbar: PageToolbar,
});
