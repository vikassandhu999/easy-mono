import {formatIsoDateOnly} from '@easy/utils';
import {ClipboardCheck} from 'lucide-react';
import {Link} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {ChatMessageEmbed} from '@/api/attachments';

export default function MessageEmbed({embed}: {embed: ChatMessageEmbed}) {
  return (
    <Link
      className="block min-h-11 rounded-xl border border-border bg-surface-secondary p-3 text-foreground"
      to={ROUTES.CHECKIN_REVIEW.replace(':id', embed.id)}
    >
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <ClipboardCheck size={15} /> Check-in
      </span>
      <span className="mt-1 block text-sm font-semibold">{embed.snapshot.title}</span>
      <span className="mt-0.5 block text-muted text-xs">
        Submitted {formatIsoDateOnly(embed.snapshot.submitted_at)}
      </span>
    </Link>
  );
}
