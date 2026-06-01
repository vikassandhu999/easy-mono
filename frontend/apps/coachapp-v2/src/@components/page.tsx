import {Surface, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ReactNode, UIEvent} from 'react';
import {useState} from 'react';

interface PageProps {
  children: ReactNode;
  className?: string;
}

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

function PageHeader({children, className}: PageProps) {
  return (
    <div
      className={cn('flex shrink-0 flex-row items-center justify-between gap-3 pt-4 px-4 md:px-6 lg:px-8', className)}
    >
      {children}
    </div>
  );
}

function PageTitleGroup({children, className}: PageProps) {
  return <div className={className}>{children}</div>;
}

function PageTitle({children, className}: PageTitleProps) {
  return (
    <Typography
      className={className}
      type="h6"
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

function PageToolbar({children, className}: PageProps) {
  return <div className={cn('mb-6 shrink-0 px-4 md:px-6 lg:px-8', className)}>{children}</div>;
}

function PageContent({children, className}: PageProps) {
  return <div className={cn('flex min-h-0 flex-1 flex-col', className)}>{children}</div>;
}

export const Page = Object.assign(PageRoot, {
  Actions: PageActions,
  Content: PageContent,
  Description: PageDescription,
  Header: PageHeader,
  Title: PageTitle,
  TitleGroup: PageTitleGroup,
  Toolbar: PageToolbar,
});
