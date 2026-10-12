import {ArrowUpRight} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';

export function ActionCard({
  title,
  description,
  eyebrow,
  icon,
  to,
  tone = 'plain',
}: {
  title: string;
  description: string;
  eyebrow?: string;
  icon: ReactNode;
  to: string;
  tone?: 'plain' | 'training' | 'coach';
}) {
  return (
    <Link
      to={to}
      aria-label={title}
      className="action-card"
      data-tone={tone}
    >
      <span
        className="action-card-icon"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        {eyebrow && <span className="block text-xs font-semibold mb-1 text-muted-foreground">{eyebrow}</span>}
        <span className="block text-xl font-bold tracking-tight">{title}</span>
        <span className="block text-sm leading-relaxed mt-1 text-muted-foreground">{description}</span>
      </span>
      <ArrowUpRight
        className="size-5 shrink-0"
        aria-hidden="true"
      />
    </Link>
  );
}
