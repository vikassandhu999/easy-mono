import {withThrottling} from '@easy/utils';
import type {MutableRefObject} from 'react';
import {useCallback, useRef, useState} from 'react';
import {useDateList} from '../DateList';

export type BubbleDateProps = {
  bubbleDate: string | undefined;
  bubbleDateClassName?: string;
  showBubble: boolean;
  bubbleDateStyle?: React.CSSProperties;
};

type useDateScrollReturn = {
  innerRef: (node: HTMLElement | null) => void;
  bubbleRef: MutableRefObject<HTMLDivElement | null>;
  listStyle?: string;
} & BubbleDateProps;

export const useDateScroll = (margin = 8): useDateScrollReturn => {
  const [bubbleDate, setBubbleDate] = useState<{
    date: string;
    show: boolean;
    style?: React.CSSProperties;
    bubbleDateClassName?: string;
    offset: number;
  }>({
    date: '',
    show: false,
    style: undefined,
    bubbleDateClassName: undefined,
    offset: 0,
  });

  const {list} = useDateList();

  const bubbleRef = useRef<HTMLDivElement>(null);

  const callbackRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) {
        return;
      }

      const bubbleOffset = bubbleRef.current?.getBoundingClientRect().bottom || 0;

      const onScroll = (() => {
        let timeout: ReturnType<typeof setTimeout>;
        return (elements: Set<HTMLElement>) => {
          clearTimeout(timeout);

          // Gets the first non visible message date and sets the bubble date to it
          const [date, message, style] = [...elements].reduce(
            (ret, message) => {
              // Sanitize elements
              if (!message.dataset.id) {
                return ret;
              }

              const {top, height} = message.getBoundingClientRect();
              const {id} = message.dataset;

              // if the bubble if between the divider and the top, position it at the top of the divider
              if (top > bubbleOffset && top < bubbleOffset + height) {
                return [
                  ret[0] || new Date(id).toISOString(),
                  ret[1] || message,
                  {
                    position: 'absolute',
                    top: `${top - height - bubbleOffset + margin}px`,
                    left: ' 50%',
                    translate: '-50%',
                    zIndex: 11,
                  },
                ];
              }

              if (top < bubbleOffset + height) {
                return [
                  new Date(id).toISOString(),
                  message,
                  {
                    position: 'absolute',
                    top: `${margin}px`,
                    left: ' 50%',
                    translate: '-50%',
                    zIndex: 11,
                  },
                ];
              }
              return ret;
            },
            [] as [string, HTMLElement, {[key: number]: string | number}?] | [],
          );

          // We always keep the previous date if we don't have a new one, so when the bubble disappears it doesn't flicker
          setBubbleDate((current) => ({
            ...current,
            date: '',
            ...(date && {date}),
            show: Boolean(date),
            style,
          }));

          if (message) {
            const {top} = message.getBoundingClientRect();
            if (top < bubbleOffset && top > 0) {
              return;
            }
          }

          timeout = setTimeout(
            () =>
              setBubbleDate((current) => ({
                ...current,
                show: false,
              })),
            1000,
          );
        };
      })();

      const fn = withThrottling({wait: 30})(() => {
        onScroll(list);
      });

      node.addEventListener('scroll', fn, {passive: true});
    },
    [list, margin],
  );

  return {
    innerRef: callbackRef,
    bubbleRef,
    bubbleDate: bubbleDate.date,
    bubbleDateStyle: bubbleDate.style,
    showBubble: Boolean(bubbleDate.show),
  };
};
