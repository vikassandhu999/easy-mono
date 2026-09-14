import {Mic, Square} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Button} from '../ui/button';
import {DialogClose, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';

type Recording =
  | {kind: 'idle'}
  | {kind: 'requesting'}
  | {kind: 'recording'}
  | {kind: 'preview'; file: File; url: string}
  | {kind: 'error'; message: string};

function stopTracks(stream: MediaStream | undefined) {
  for (const track of stream?.getTracks() ?? []) {
    track.stop();
  }
}

export function VoiceNote({onAttach}: {onAttach: (file: File) => void}) {
  const [recording, setRecording] = useState<Recording>({kind: 'idle'});
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const previewUrl = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const active = recorder.current;
      if (active) {
        active.onstop = null;
        active.ondataavailable = null;
        active.onerror = null;
        if (active.state !== 'inactive') {
          active.stop();
        }
        stopTracks(active.stream);
      }
      if (previewUrl.current) {
        URL.revokeObjectURL(previewUrl.current);
      }
    };
  }, []);
  useEffect(() => {
    if (recording.kind !== 'recording') {
      return;
    }
    const started = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((performance.now() - started) / 1000);
      setSeconds(Math.min(elapsed, 180));
      if (elapsed >= 180 && recorder.current?.state === 'recording') {
        recorder.current.stop();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording.kind]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecording({
        kind: 'error',
        message: 'Voice recording is unavailable in this browser. You can attach an audio file instead.',
      });
      return;
    }
    const mimeType = ['audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      setRecording({
        kind: 'error',
        message: 'This browser cannot record a supported audio format. You can attach an audio file instead.',
      });
      return;
    }
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    }
    setRecording({kind: 'requesting'});
    setSeconds(0);
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({audio: true});
      if (!mounted.current) {
        stopTracks(stream);
        return;
      }
      const active = new MediaRecorder(stream, {mimeType, audioBitsPerSecond: 64000});
      recorder.current = active;
      const chunks: Blob[] = [];
      active.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      active.onerror = () => {
        active.onstop = null;
        stopTracks(active.stream);
        if (mounted.current) {
          setRecording({kind: 'error', message: 'Recording was interrupted. Please record your note again.'});
        }
      };
      active.onstop = () => {
        stopTracks(active.stream);
        if (!mounted.current) {
          return;
        }
        const file = new File(chunks, `voice-note.${mimeType === 'audio/mp4' ? 'm4a' : 'webm'}`, {type: mimeType});
        if (file.size === 0 || file.size > 10 * 1024 * 1024) {
          setRecording({kind: 'error', message: 'This recording could not be saved. Try a shorter voice note.'});
          return;
        }
        const url = URL.createObjectURL(file);
        previewUrl.current = url;
        setRecording({kind: 'preview', file, url});
      };
      active.start(1000);
      setRecording({kind: 'recording'});
    } catch (error) {
      stopTracks(stream);
      if (mounted.current) {
        setRecording({
          kind: 'error',
          message:
            error instanceof DOMException && error.name === 'NotAllowedError'
              ? 'Microphone access was denied. Allow microphone access in your browser and try again, or attach an audio file.'
              : 'Could not start the microphone. Check that it is connected and try again.',
        });
      }
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Voice note</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-5">
        <p className="text-sm text-muted-foreground">
          Record up to 3 minutes. Listen back before adding it to your message.
        </p>
        {recording.kind === 'error' && <FormError message={recording.message} />}
        {recording.kind === 'recording' && (
          <div className="space-y-3">
            <p
              role="status"
              className="font-medium"
            >
              Recording…
            </p>
            <p
              className="text-3xl tabular-nums"
              role="timer"
              aria-label="Recording duration"
            >
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </p>
            <Button
              onPress={() => {
                if (recorder.current?.state === 'recording') {
                  recorder.current.stop();
                }
              }}
            >
              <Square aria-hidden="true" />
              Stop recording
            </Button>
          </div>
        )}
        {recording.kind === 'preview' && (
          <div className="space-y-3">
            <p className="font-medium">Listen to your voice note</p>
            <audio
              controls
              src={recording.url}
              className="w-full"
              aria-label="Voice note preview"
            >
              <track kind="captions" />
            </audio>
            <Button onPress={() => onAttach(recording.file)}>Use voice note</Button>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {recording.kind !== 'recording' && (
            <Button
              variant="outline"
              isPending={recording.kind === 'requesting'}
              onPress={() => {
                start();
              }}
            >
              <Mic aria-hidden="true" />
              {recording.kind === 'preview' ? 'Record again' : 'Start recording'}
            </Button>
          )}
          <DialogClose variant="ghost">Discard and close</DialogClose>
        </div>
      </div>
    </>
  );
}
