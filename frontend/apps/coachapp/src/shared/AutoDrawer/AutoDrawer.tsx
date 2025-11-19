/*
  A responsive drawer/modal component that automatically adapts to screen size.
  Renders as a bottom drawer on mobile/tablet devices and a centered modal on desktop.
  Includes a sticky header with back button, title, and optional action buttons.

*/

import {ActionIcon, Box, Drawer, Group, Modal, ScrollArea, Stack, Title} from '@mantine/core';
import {IconArrowLeft} from '@tabler/icons-react';
import React from 'react';

import useScreenSize from '@/hooks/useScreenSize';

type AutoDrawerProps = {
    title: React.ReactNode | string;
    content: React.ReactNode;
    actions?: React.ReactNode;
    onClose: () => void;
};

const Header = ({onClose, title, actions}: AutoDrawerProps) => {
    const BackElement = (
        <ActionIcon
            color="dark"
            onClick={onClose}
            radius="lg"
            size="lg"
            style={{cursor: 'pointer', flexShrink: 0}}
            variant="subtle"
        >
            <IconArrowLeft size={24} />
        </ActionIcon>
    );

    const TitleElement =
        typeof title === 'string' ? (
            <Title
                fw={600}
                lineClamp={1}
                order={5}
                style={{overflow: 'hidden', textOverflow: 'ellipsis'}}
            >
                {title}
            </Title>
        ) : (
            <Box style={{overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0}}>{title}</Box>
        );

    const ActionElements = actions && <Box style={{flexShrink: 0, marginLeft: 'auto'}}>{actions}</Box>;

    return (
        <Box
            bg="white"
            px="sm"
            py="sm"
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                borderBottom: '1px solid #eee',
            }}
        >
            <Group
                align="center"
                gap="sm"
                justify="space-between"
                w="100%"
                wrap="wrap"
            >
                <Group
                    align="center"
                    gap="xs"
                    style={{flex: '1 1 auto', minWidth: 0}}
                >
                    {BackElement}
                    {TitleElement}
                    {ActionElements}
                </Group>
            </Group>
        </Box>
    );
};

const AutoDrawer = (props: AutoDrawerProps) => {
    const {content, onClose} = props;
    const {isMobile, isTab} = useScreenSize();
    const isMobileOrTab = isMobile || isTab;

    const finalContent = (
        <Stack mah="100vh">
            <Header {...props} />
            <ScrollArea.Autosize
                offsetScrollbars
                type="never"
            >
                <Box p="md">{content}</Box>
            </ScrollArea.Autosize>
        </Stack>
    );

    if (isMobileOrTab) {
        return (
            <Drawer
                onClose={onClose}
                opened={true}
                position="bottom"
                radius={0}
                scrollAreaComponent={ScrollArea.Autosize}
                size="auto"
                style={{
                    position: 'relative',
                }}
                withCloseButton={false}
            >
                {finalContent}
            </Drawer>
        );
    }

    return (
        <Modal
            centered
            onClose={onClose}
            opened={true}
            radius="lg"
            scrollAreaComponent={ScrollArea.Autosize}
            size="lg"
            style={{
                position: 'relative',
            }}
            styles={{
                body: {
                    padding: 0,
                },
            }}
            withCloseButton={false}
        >
            {finalContent}
        </Modal>
    );
};

export default AutoDrawer;
