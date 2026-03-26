import {Button, toast} from '@heroui/react';
import {Check, Copy, Download} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {useCallback, useRef, useState} from 'react';

import type {Offer} from '@/api/offers';

const BASE_URL = 'https://coacheasy.app';

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.danger('Failed to copy');
    }
  }, []);

  return {copied, copy};
}

export default function SharePanel({offers, slug}: {offers: Offer[]; slug: null | string}) {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!slug) return null;

  const pageUrl = `${BASE_URL}/coach/${slug}`;

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 text-base font-semibold">Share your page</legend>

      {/* Page link */}
      <LinkRow
        label="Page link"
        url={pageUrl}
      />

      {/* Offer deep links */}
      {offers
        .filter((o) => o.status === 'active')
        .map((offer) => (
          <LinkRow
            key={offer.id}
            label={offer.name}
            url={`${pageUrl}?offer=${offer.slug}`}
          />
        ))}

      {/* QR code */}
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm font-medium text-foreground-500">QR Code</p>
        <div
          className="rounded-xl border border-divider bg-white p-4"
          ref={qrRef}
        >
          <QRCodeSVG
            level="M"
            size={160}
            value={pageUrl}
          />
        </div>
        <Button
          onPress={() => {
            const svg = qrRef.current?.querySelector('svg');
            if (!svg) return;
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${slug}-qr.svg`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          size="sm"
          variant="ghost"
        >
          <Download size={14} />
          Download QR
        </Button>
      </div>
    </fieldset>
  );
}

function LinkRow({label, url}: {label: string; url: string}) {
  const {copied, copy} = useCopyToClipboard();

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-foreground-400">{label}</p>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-lg bg-default-100 px-3 py-2 text-sm">{url}</span>
        <Button
          isIconOnly
          onPress={() => copy(url)}
          size="sm"
          variant="ghost"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </Button>
      </div>
    </div>
  );
}
