import {humanizeError} from '@easy/error-parser';
import {ActionIcon, Menu, Modal} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {IconCopy, IconCopyPlus, IconDots, IconPencil, IconTrash} from '@tabler/icons-react';
import {FC} from 'react';
import {useSearchParams} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import useScreenSize from '@/hooks/useScreenSize';
import {useDeleteNutritionPlan, useGetNutritionPlan} from '@/services/nutrition_plans';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import NutritionPlanBuilder from '@/shared/NutritionPlanBuilder/NutritionPlanBuilder';
import {notifyError, notifySuccess} from '@/utils/notification';

type ActionMenuProps = {
    nutritionPlanId: string;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onAssign: () => void;
};

export default function NutritionPlanBuildDrawer() {
    const {openDrawer, closeDrawer} = useParamsDrawer({});
    const [searchParams] = useSearchParams();
    const {isMobile} = useScreenSize();
    const [deleteModalOpened, {open: openDeleteModal, close: closeDeleteModal}] = useDisclosure(false);
    const [deleteNutritionPlan, {isLoading: isDeleting}] = useDeleteNutritionPlan();

    const nutritionPlanId = searchParams.get('nutrition_plan_id') ?? '';

    const {data: plan} = useGetNutritionPlan(nutritionPlanId, {
        skip: !nutritionPlanId,
    });

    const planNameTitle = plan?.name
        ? plan.name.length > 10 && isMobile
            ? `${plan.name.substring(0, 20)}...`
            : plan.name
        : 'Build Nutrition Plan';

    const handleEdit = () => {
        if (nutritionPlanId) {
            openDrawer(DRAWER_KEYS.NUTRITION_PLAN_EDIT, {nutrition_plan_id: nutritionPlanId});
        }
    };

    const handleDelete = async () => {
        if (!nutritionPlanId) return;

        try {
            await deleteNutritionPlan(nutritionPlanId).unwrap();
            notifySuccess('Nutrition plan deleted successfully');
            closeDeleteModal();
            closeDrawer();
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    const handleDuplicate = () => {
        // TODO: Implement duplicate functionality
        // This should create a copy of the nutrition plan
        console.log('Duplicate nutrition plan:', nutritionPlanId);
        notifyError('Duplicate functionality coming soon!');
    };

    const handleAssign = () => {
        // TODO: Implement assign to client functionality
        console.log('Assign nutrition plan to client:', nutritionPlanId);
        notifyError('Assign to client functionality coming soon!');
    };

    return (
        <>
            <AutoDrawer
                actions={
                    <ActionMenu
                        nutritionPlanId={nutritionPlanId}
                        onAssign={handleAssign}
                        onDelete={openDeleteModal}
                        onDuplicate={handleDuplicate}
                        onEdit={handleEdit}
                    />
                }
                content={<NutritionPlanBuilder />}
                onClose={closeDrawer}
                title={planNameTitle}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                centered
                onClose={closeDeleteModal}
                opened={deleteModalOpened}
                title="Delete Nutrition Plan"
            >
                <div>
                    <p>Are you sure you want to delete this nutrition plan?</p>
                    <p style={{color: 'var(--mantine-color-dimmed)', fontSize: '14px'}}>
                        This action cannot be undone.
                    </p>
                    <div style={{display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end'}}>
                        <button
                            onClick={closeDeleteModal}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid var(--mantine-color-gray-4)',
                                borderRadius: '8px',
                                background: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isDeleting}
                            onClick={handleDelete}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '8px',
                                background: 'var(--mantine-color-red-6)',
                                color: 'white',
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                opacity: isDeleting ? 0.6 : 1,
                            }}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

const ActionMenu: FC<ActionMenuProps> = ({nutritionPlanId, onEdit, onDelete, onDuplicate, onAssign}) => {
    if (!nutritionPlanId) return null;

    return (
        <Menu
            position="bottom-end"
            shadow="md"
            width={200}
        >
            <Menu.Target>
                <ActionIcon
                    color="dark"
                    variant="subtle"
                >
                    <IconDots />
                </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item
                    leftSection={<IconPencil size={14} />}
                    onClick={onEdit}
                >
                    Edit Basic Info
                </Menu.Item>
                <Menu.Item
                    leftSection={<IconCopy size={14} />}
                    onClick={onAssign}
                >
                    Assign to a client
                </Menu.Item>
                <Menu.Item
                    leftSection={<IconCopyPlus size={14} />}
                    onClick={onDuplicate}
                >
                    Duplicate
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={onDelete}
                >
                    Delete Plan
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
};
