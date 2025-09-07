import {Group, ActionIcon, Title, Button, Menu, Text} from '@mantine/core';
import {Program} from '@/Api/Programs';
import {useNavigate} from 'react-router';
import {ArrowLeftIcon, DotsThreeVerticalIcon, EyeIcon, PencilIcon, UserPlusIcon} from '@phosphor-icons/react';
import {ProgramEditWithTrigger} from '@/Components/ProgramEditWithTrigger/ProgramEditWithTrigger';
import {useProgramActions} from '../hooks/useProgramActions';
import {modals} from '@mantine/modals';

type Props = {
    program: Program;
    showTitle?: boolean;
};

export default function Header({program, showTitle = false}: Props) {
    const {publish, unpublish} = useProgramActions(program.id);

    const handleTogglePublish = () => {
        if (!program) return;

        if (program.is_published) {
            modals.openConfirmModal({
                title: 'Unpublish Program',
                children: (
                    <Text size="sm">
                        Unpublishing "{program.name}" will make it unavailable to new clients. Existing enrollments will
                        continue.
                    </Text>
                ),
                labels: {confirm: 'Unpublish', cancel: 'Cancel'},
                confirmProps: {color: 'orange'},
                onConfirm: () => unpublish(),
            });
        } else {
            publish();
        }
    };
    const navigate = useNavigate();

    const handleBackClick = () => {
        navigate('/programs');
    };

    return (
        <Group
            style={{minWidth: 0, flex: 1}}
            wrap={'nowrap'}
            justify={'space-between'}
        >
            <Group
                gap={'xs'}
                flex={1}
                wrap={'nowrap'}
            >
                <ActionIcon
                    size={'xl'}
                    variant={'subtle'}
                    onClick={handleBackClick}
                    c={'dark'}
                    style={{borderRadius: 9999}}
                >
                    <ArrowLeftIcon size={24} />
                </ActionIcon>
                {showTitle && (
                    <Title
                        order={6}
                        lineClamp={1}
                    >
                        {program.name}
                    </Title>
                )}
            </Group>

            {!showTitle && (
                <Group
                    justify="space-between"
                    align="center"
                    gap={'sm'}
                >
                    {/* Primary Action */}
                    <Button
                        size="sm"
                        radius={9999}
                        variant={program.is_published ? 'subtle' : 'filled'}
                        leftSection={<EyeIcon size={16} />}
                        onClick={handleTogglePublish}
                    >
                        {program.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    {/* Program Actions Menu */}
                    <Menu
                        shadow="md"
                        position="bottom-end"
                    >
                        <Menu.Target>
                            <ActionIcon
                                variant={'subtle'}
                                color={'dark'}
                                size={'xl'}
                                radius={9999}
                                aria-label="Program actions"
                            >
                                <DotsThreeVerticalIcon size={24} />
                            </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                            <ProgramEditWithTrigger>
                                {({onClick}) => (
                                    <Menu.Item
                                        leftSection={<PencilIcon size={20} />}
                                        onClick={() => onClick(program.id)}
                                    >
                                        Edit Program
                                    </Menu.Item>
                                )}
                            </ProgramEditWithTrigger>

                            <Menu.Item
                                leftSection={<UserPlusIcon size={20} />}
                                onClick={() => {
                                    console.log('Add client to program:', program.id);
                                }}
                            >
                                Add Clients
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            )}
        </Group>
    );
}
