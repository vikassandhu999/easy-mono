import type {ComponentProps} from 'react';
import {
  composeRenderProps,
  TabList as TabListPrimitive,
  TabPanel as TabPanelPrimitive,
  Tab as TabPrimitive,
  Tabs as TabsPrimitive,
} from 'react-aria-components';
import {cn} from './cn';

export function Tabs(props: ComponentProps<typeof TabsPrimitive>) {
  return (
    <TabsPrimitive
      data-slot="tabs"
      {...props}
    />
  );
}

export function TabList<T extends object>(props: ComponentProps<typeof TabListPrimitive<T>>) {
  return (
    <TabListPrimitive
      data-slot="tab-list"
      {...props}
    />
  );
}

export function Tab({className, ...props}: ComponentProps<typeof TabPrimitive>) {
  return (
    <TabPrimitive
      data-slot="tab"
      className={composeRenderProps(className, (value) =>
        cn('cursor-pointer outline-none data-focus-visible:ring-2 data-focus-visible:ring-ring', value),
      )}
      {...props}
    />
  );
}

export function TabPanel({className, ...props}: ComponentProps<typeof TabPanelPrimitive>) {
  return (
    <TabPanelPrimitive
      data-slot="tab-panel"
      className={composeRenderProps(className, (value) => cn('outline-none', value))}
      {...props}
    />
  );
}
