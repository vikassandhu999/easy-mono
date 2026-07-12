interface PageLayoutProps {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  title: string;
}

export default function PageLayout({action, children, description, title}: PageLayoutProps) {
  return (
    <div className="overflow-hidden px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.125rem)]">
      <div className="mb-[18px] flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[25px] font-extrabold leading-[1.05] tracking-[-0.025em]">{title}</h1>
          {description && (
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
