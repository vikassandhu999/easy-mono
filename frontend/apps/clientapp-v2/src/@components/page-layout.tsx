interface PageLayoutProps {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  title: string;
}

export default function PageLayout({action, children, description, title}: PageLayoutProps) {
  return (
    <div className="overflow-hidden px-4 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
