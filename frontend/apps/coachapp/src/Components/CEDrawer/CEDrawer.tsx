import {useEffect} from 'react';
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

export interface DrawerProps extends DrawerRootProps {
    /** Drawer header */
    header?: React.ReactNode;

    /** If set, the overlay is displayed @default `true` */
    withOverlay?: boolean;

    /** Props passed down to the `Overlay` component, can be used to configure opacity, `background-color`, styles and other properties */
    overlayProps?: ModalBaseOverlayProps;

    /** Drawer content */
    children?: React.ReactNode;

    /** If set, the close button is displayed @default `true` */
    withCloseButton?: boolean;

    /** Props passed down to the close button */
    closeButtonProps?: ModalBaseCloseButtonProps;

    /** Id of the drawer in the `Drawer.Stack` */
    stackId?: string;
}

export type DrawerFactory = Factory<{
    props: DrawerProps;
    ref: HTMLDivElement;
    stylesNames: DrawerStylesNames;
    vars: DrawerCssVariables;
    staticComponents: {
        Root: typeof DrawerRoot;
        Overlay: typeof DrawerOverlay;
        Content: typeof DrawerContent;
        Body: typeof DrawerBody;
        Header: typeof DrawerHeader;
        Title: typeof DrawerTitle;
        CloseButton: typeof DrawerCloseButton;
        Stack: typeof DrawerStack;
    };
}>;

const defaultProps = {
    closeOnClickOutside: true,
    withinPortal: true,
    lockScroll: true,
    trapFocus: true,
    returnFocus: true,
    closeOnEscape: true,
    keepMounted: false,
    zIndex: getDefaultZIndex('modal'),
    withOverlay: true,
    withCloseButton: true,
} satisfies Partial<DrawerProps>;

export const CEDrawer = factory<DrawerFactory>((_props, ref) => {
    const {header, withOverlay, overlayProps, children, opened, stackId, zIndex, ...others} = useProps(
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
            ref={ref}
            opened={opened}
            zIndex={ctx && stackId ? ctx.getZIndex(stackId) : zIndex}
            {...others}
            {...stackProps}
        >
            {withOverlay && (
                <DrawerOverlay
                    visible={overlayVisible}
                    transitionProps={ctx && stackId ? {duration: 0} : undefined}
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

CEDrawer.displayName = '@mantine/core/CEDrawer';
CEDrawer.Root = DrawerRoot;
CEDrawer.Overlay = DrawerOverlay;
CEDrawer.Content = DrawerContent;
CEDrawer.Body = DrawerBody;
CEDrawer.Header = DrawerHeader;
CEDrawer.Title = DrawerTitle;
CEDrawer.CloseButton = DrawerCloseButton;
CEDrawer.Stack = DrawerStack;
