import {Box, List, ListItem, Loader} from '@mantine/core';
import React, {useCallback} from 'react';

import useIntersectionObserver from '@/hooks/useIntersectionObserver';

import classes from './ListView.module.css';

type RenderOptions = {
  col: number;
  row: number;
};

interface PropsType<T> {
  emptyState?: React.ReactNode;
  getKey: (item: T) => number | string;
  hasMore?: boolean;
  items: T[] | T[][];
  loadingMore?: boolean;

  onLoadMore?: () => void;

  querying: boolean;

  render: (item: T, options?: RenderOptions) => React.ReactNode;
}

const is2dArray = <T,>(arr: T[] | T[][]): arr is T[][] => {
  return Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0]);
};

export default function ListView<T>({
  querying,
  items,
  render,
  onLoadMore,
  loadingMore,
  hasMore,
  getKey,
  emptyState,
}: PropsType<T>): JSX.Element {
  const containerRef = React.useRef<HTMLUListElement>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  useIntersectionObserver({
    root: containerRef,
    target: loadMoreRef,
    onIntersect: onLoadMore,
    enabled: hasMore ?? false,
  });

  const renderItems = useCallback(() => {
    if (is2dArray(items)) {
      return items.map((innerItems, row) => (
        <React.Fragment key={row}>
          {innerItems.map((item, col) => (
            <ListItem
              className={classes.listItem}
              key={getKey(item)}
            >
              {render(item, {row, col})}
            </ListItem>
          ))}
        </React.Fragment>
      ));
    } else {
      return items.map((item, col) => (
        <ListItem
          className={classes.listItem}
          key={getKey(item)}
        >
          {render(item, {col, row: 0})}
        </ListItem>
      ));
    }
  }, [items, getKey, render]);

  return (
    <List
      className={classes.list}
      ref={containerRef}
    >
      {querying ? <Loader /> : null}
      {!querying && items.length === 0 ? <div>{emptyState}</div> : renderItems()}
      {onLoadMore && hasMore && (
        <div ref={loadMoreRef}>
          <Box
            hidden={!loadingMore}
            style={{height: 48}}
          >
            <Loader size="sm" />
          </Box>
        </div>
      )}
    </List>
  );
}
