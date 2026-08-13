import {mediaKind} from '@easy/utils';
import {Button, ProgressBar} from '@heroui/react';
import {Camera, ImagePlus, Mic, RotateCcw, Square, Trash2, X} from 'lucide-react';

import {ACCEPTED_TYPES} from '@/messages/lib/attachment-files';
import useAttachmentComposer, {type AttachmentComposerState} from '@/messages/use-attachment-composer';

type AttachmentComposerProps = {
  clientId: string;
  disabled: boolean;
  onChange: (state: AttachmentComposerState) => void;
};

export default function AttachmentComposer({clientId, disabled, onChange}: AttachmentComposerProps) {
  const {
    cancelRecording,
    chooseFiles,
    controlsDisabled,
    fieldError,
    inputId,
    isRecording,
    isStarting,
    isStopping,
    items,
    recordingMs,
    removeItem,
    retryUpload,
    startRecording,
    stopRecording,
  } = useAttachmentComposer({clientId, disabled, onChange});

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1 px-2 sm:flex-none"
          isDisabled={controlsDisabled}
          onPress={() => document.getElementById(`${inputId}-camera`)?.click()}
          size="sm"
          variant="ghost"
        >
          <Camera size={17} /> Camera
        </Button>
        <Button
          className="flex-1 px-2 sm:flex-none"
          isDisabled={controlsDisabled}
          onPress={() => document.getElementById(`${inputId}-library`)?.click()}
          size="sm"
          variant="ghost"
        >
          <ImagePlus size={17} /> Library
        </Button>
        {isRecording ? (
          <>
            <Button
              onPress={stopRecording}
              variant="secondary"
            >
              <Square size={16} /> Stop {Math.floor(recordingMs / 60_000)}:
              {String(Math.floor((recordingMs % 60_000) / 1000)).padStart(2, '0')}
            </Button>
            <Button
              aria-label="Cancel recording"
              isIconOnly
              onPress={cancelRecording}
              variant="secondary"
            >
              <X size={18} />
            </Button>
          </>
        ) : (
          <Button
            className="flex-1 px-2 sm:flex-none"
            isDisabled={controlsDisabled}
            isPending={isStarting || isStopping}
            onPress={startRecording}
            size="sm"
            variant="ghost"
          >
            <Mic size={17} /> Voice
          </Button>
        )}
        <input
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={controlsDisabled}
          id={`${inputId}-camera`}
          onChange={chooseFiles}
          type="file"
        />
        <input
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          disabled={controlsDisabled}
          id={`${inputId}-library`}
          multiple
          onChange={chooseFiles}
          type="file"
        />
      </div>

      {items.length > 0 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const kind = mediaKind(item.file.type);
            return (
              <div
                className="w-28 shrink-0 overflow-hidden rounded-panel border border-border bg-surface"
                key={item.localId}
              >
                <div className="relative grid aspect-square place-items-center overflow-hidden bg-surface-secondary">
                  {kind === 'image' ? (
                    <img
                      alt={item.file.name}
                      className="size-full object-cover"
                      src={item.previewUrl}
                    />
                  ) : kind === 'video' ? (
                    <video
                      className="size-full object-cover"
                      muted
                      src={item.previewUrl}
                    />
                  ) : (
                    // biome-ignore lint/a11y/useMediaCaption: local voice-note preview has no caption track
                    <audio
                      className="w-full px-2"
                      controls
                      src={item.previewUrl}
                    />
                  )}
                  {item.status !== 'uploading' ? (
                    <Button
                      aria-label={`Remove ${item.file.name}`}
                      className="absolute right-1 top-1 bg-surface/90 p-0"
                      isDisabled={disabled}
                      isIconOnly
                      onPress={() => removeItem(item)}
                      size="sm"
                      variant="secondary"
                    >
                      <Trash2 size={15} />
                    </Button>
                  ) : null}
                </div>
                <div className="p-2">
                  {item.status === 'uploading' ? (
                    <ProgressBar
                      aria-label={`Uploading ${item.file.name}`}
                      value={item.progress}
                    />
                  ) : item.status === 'error' ? (
                    <div className="grid gap-2">
                      <p className="text-danger-soft-foreground type-eyebrow">
                        {item.errorMessage ?? 'Upload failed.'}
                      </p>
                      <Button
                        className="w-full px-2 type-eyebrow"
                        isDisabled={disabled}
                        onPress={() => retryUpload(item.file, item.durationMs, item.localId)}
                        size="sm"
                        variant="secondary"
                      >
                        <RotateCcw size={14} /> Retry
                      </Button>
                    </div>
                  ) : (
                    <p className="truncate text-success-soft-foreground type-eyebrow">Ready</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {fieldError ? <p className="mt-2 text-danger-soft-foreground type-eyebrow">{fieldError}</p> : null}
    </div>
  );
}
