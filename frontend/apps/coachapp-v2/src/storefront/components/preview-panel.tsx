import {Button} from '@heroui/react';
import {type RefObject, useState} from 'react';

import {getPreviewUrl} from '@/storefront/storefront-editor';

type PreviewDevice = 'desktop' | 'mobile';

export default function PreviewPanel({
  iframeRef,
  slug,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  slug: string;
}) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const previewUrl = slug ? getPreviewUrl(slug) : '';

  return (
    <div className="flex h-full flex-col bg-default-50">
      <div className="flex items-center justify-center gap-2 border-b border-divider px-4 py-2">
        <Button
          className={`min-h-11 ${device === 'desktop' ? 'bg-default-200 text-foreground' : 'text-foreground-400'}`}
          onPress={() => setDevice('desktop')}
          size="sm"
          variant="ghost"
        >
          Desktop
        </Button>
        <Button
          className={`min-h-11 ${device === 'mobile' ? 'bg-default-200 text-foreground' : 'text-foreground-400'}`}
          onPress={() => setDevice('mobile')}
          size="sm"
          variant="ghost"
        >
          Mobile
        </Button>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-auto p-4">
        {previewUrl ? (
          <div
            className={`h-full overflow-hidden rounded-lg border border-divider bg-white shadow-sm transition-all ${device === 'mobile' ? 'w-[375px]' : 'w-full'}`}
          >
            <iframe
              className="h-full w-full border-0"
              ref={iframeRef}
              src={previewUrl}
              title="Storefront preview"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-sm text-foreground-400">Set a page URL slug to see your preview.</p>
          </div>
        )}
      </div>
    </div>
  );
}
