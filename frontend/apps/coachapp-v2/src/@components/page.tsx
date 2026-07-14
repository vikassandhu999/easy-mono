import {Surface, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ReactNode, UIEvent} from 'react';
import {useState} from 'react';

interface PageProps {
  children: ReactNode;
  className?: string;
}

type PageSize = 'form' | 'list' | 'wide';

interface PageLayoutProps extends PageProps {
  size?: PageSize;
}

const PAGE_SIZE_CLASS: Record<PageSize, string> = {
  form: 'max-w-3xl',
  list: 'mx-auto max-w-5xl',
  wide: 'max-w-6xl',
};

const PAGE_GUTTER_CLASS = 'w-full px-4 md:px-6 lg:px-8';

interface PageTitleProps {
  children: ReactNode;
  className?: string;
}

interface PageDescriptionProps {
  children: ReactNode;
  className?: string;
}

function PageRoot({children, className}: PageProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    setIsScrolled(event.currentTarget.scrollTop > 0);
  }

  return (
    <Surface
      className={cn('easy_page relative z-0 mr-0 ml-0 block flex-1', className)}
      data-scrollbar="thin"
    >
      <div
        className="easy_main-content group/page absolute inset-0 overflow-y-auto scrollbar"
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

function PageTitle({children, className}: PageTitleProps) {
  return (
    <Typography
      className={cn('min-w-0 truncate', className)}
      type="h3"
    >
      {children}
    </Typography>
  );
}

function PageDescription({children, className}: PageDescriptionProps) {
  return (
    <Typography
      className={cn('mt-1', className)}
      color="muted"
      type="body-sm"
    >
      {children}
    </Typography>
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

function PageContent({children, className}: PageProps) {
  return <div className={cn('flex min-h-0 flex-1 flex-col', className)}>{children}</div>;
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
