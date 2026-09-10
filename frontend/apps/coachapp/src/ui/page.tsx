import {ArrowLeft} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {cn} from './cn';

export function Page({children}: {children: ReactNode}) {
  return <div className="page">{children}</div>;
}

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: ReactNode;
  back?: {to: string; label: string};
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      {back && (
        <Link
          to={back.to}
          className="page-back"
        >
          <ArrowLeft
            aria-hidden="true"
            size={18}
          />
          {back.label}
        </Link>
      )}
      <div className="page-heading-row">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {description && <div className="page-description">{description}</div>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Surface({children, className}: {children: ReactNode; className?: string}) {
  return <div className={cn('surface', className)}>{children}</div>;
}

export function FormActions({children}: {children: ReactNode}) {
  return (
    <div className="form-actions">
      <div className="form-actions-content">{children}</div>
    </div>
  );
}

export function StatusBadge({children, tone = 'neutral'}: {children: ReactNode; tone?: 'neutral' | 'positive'}) {
  return (
    <span
      className="status-badge"
      data-tone={tone}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current"
      />
      {children}
    </span>
  );
}
