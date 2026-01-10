import {
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerCssVariables,
  DrawerHeader,
  DrawerOverlay,
  DrawerRoot,
  DrawerRootProps,
  DrawerStack,
  DrawerStylesNames,
  DrawerTitle,
  Factory,
  factory,
  getDefaultZIndex,
  ModalBaseCloseButtonProps,
  ModalBaseOverlayProps,
  useDrawerStackContext,
  useProps,
} from '@mantine/core';
import React, {useEffect} from 'react';

export type DrawerFactory = Factory<{
  props: DrawerProps;
  ref: HTMLDivElement;
  staticComponents: {
    Body: typeof DrawerBody;
    CloseButton: typeof DrawerCloseButton;
    Content: typeof DrawerContent;
    Header: typeof DrawerHeader;
    Overlay: typeof DrawerOverlay;
    Root: typeof DrawerRoot;
    Stack: typeof DrawerStack;
    Title: typeof DrawerTitle;
  };
  stylesNames: DrawerStylesNames;
  vars: DrawerCssVariables;
}>;

export interface DrawerProps extends DrawerRootProps {
  /** Drawer content */
  children?: React.ReactNode;

  /** Props passed down to the close button */
  closeButtonProps?: ModalBaseCloseButtonProps;

  /** Drawer header */
  header?: React.ReactNode;

  /** Props passed down to the `Overlay` component, can be used to configure opacity, `background-color`, styles and other properties */
  overlayProps?: ModalBaseOverlayProps;

  /** Id of the drawer in the `Drawer.Stack` */
  stackId?: string;

  /** If set, the close button is displayed @default `true` */
  withCloseButton?: boolean;

  /** If set, the overlay is displayed @default `true` */
  withOverlay?: boolean;
}

const defaultProps = {
  closeOnClickOutside: true,
  closeOnEscape: true,
  keepMounted: false,
  lockScroll: true,
  returnFocus: true,
  trapFocus: true,
  withCloseButton: true,
  withinPortal: true,
  withOverlay: true,
  zIndex: getDefaultZIndex('modal'),
  size: 'md',
} satisfies Partial<DrawerProps>;

const EasyDrawer = factory<DrawerFactory>((_props, ref) => {
  const {children, header, opened, overlayProps, stackId, withOverlay, zIndex, ...others} = useProps(
    'Drawer',
    defaultProps,
    _props,
  );

  const ctx = useDrawerStackContext();
  const hasHeader = !!header;
  const stackProps =
    ctx && stackId
      ? {
          closeOnEscape: ctx.currentId === stackId,
          trapFocus: ctx.currentId === stackId,
          zIndex: ctx.getZIndex(stackId),
        }
      : {};

  const overlayVisible = withOverlay === false ? false : stackId && ctx ? ctx.currentId === stackId : opened;

  useEffect(() => {
    if (ctx && stackId) {
      opened ? ctx.addModal(stackId, zIndex || getDefaultZIndex('modal')) : ctx.removeModal(stackId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, stackId, zIndex]);

  return (
    <DrawerRoot
      opened={opened}
      ref={ref}
      zIndex={ctx && stackId ? ctx.getZIndex(stackId) : zIndex}
      {...others}
      {...stackProps}
    >
      {withOverlay && (
        <DrawerOverlay
          transitionProps={ctx && stackId ? {duration: 0} : undefined}
          visible={overlayVisible}
          {...overlayProps}
        />
      )}
      <DrawerContent __hidden={ctx && stackId && opened ? stackId !== ctx.currentId : false}>
        {hasHeader && <DrawerHeader styles={{header: {padding: 0}}}>{header}</DrawerHeader>}
        <DrawerBody>{children}</DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  );
});

EasyDrawer.displayName = 'EasyDrawer';
EasyDrawer.Root = DrawerRoot;
EasyDrawer.Overlay = DrawerOverlay;
EasyDrawer.Content = DrawerContent;
EasyDrawer.Body = DrawerBody;
EasyDrawer.Header = DrawerHeader;
EasyDrawer.Title = DrawerTitle;
EasyDrawer.CloseButton = DrawerCloseButton;
EasyDrawer.Stack = DrawerStack;

export default EasyDrawer;
