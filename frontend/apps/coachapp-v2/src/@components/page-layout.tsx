interface PageLayoutProps {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  title: string;
}

export default function PageLayout({action, children, description, title}: PageLayoutProps) {
  return (
    <div className="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold md:text-xl lg:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-foreground-500">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
