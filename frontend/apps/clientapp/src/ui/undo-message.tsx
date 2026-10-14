import {createContext, type ReactNode, useCallback, useContext, useEffect, useState} from 'react';
import {Button} from './button';
export type UndoMessage = {text: string; undo?: () => Promise<unknown>};
const Context = createContext<(message: UndoMessage) => void>(() => undefined);
export const useUndoMessage = () => useContext(Context);
export function UndoMessageProvider({children}: {children: ReactNode}) {
  const [message, setMessage] = useState<UndoMessage | null>(null);
  const [paused, setPaused] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const show = useCallback((next: UndoMessage) => {
    setMessage(next);
    setError(false);
  }, []);
  useEffect(() => {
    if (!message || paused || pending || error) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(null), 8000);
    return () => window.clearTimeout(timer);
  }, [message, paused, pending, error]);
  return (
    <Context.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(10rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
        <div
          role={error ? 'alert' : 'status'}
          className="contents"
        >
          {message && (
            <div className="pointer-events-auto flex max-w-[28rem] items-center gap-3 rounded-2xl bg-foreground py-2 pr-2 pl-4 font-semibold text-background shadow-lg">
              <span>{error ? 'Could not undo. Try again.' : message.text}</span>
              {message.undo && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-background hover:bg-background/15 data-pressed:bg-background/25"
                  isPending={pending}
                  onHoverChange={setPaused}
                  onFocusChange={setPaused}
                  onPress={async () => {
                    setPending(true);
                    try {
                      await message.undo?.();
                      setMessage(null);
                      setError(false);
                    } catch {
                      setError(true);
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  {error ? 'Retry' : 'Undo'}
                </Button>
              )}
              {error && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-background"
                  onPress={() => setMessage(null)}
                >
                  Close
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Context.Provider>
  );
}
