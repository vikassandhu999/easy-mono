import {humanizeError} from '@easy/error-parser';
import {Button, Group} from '@mantine/core';
import {useRef} from 'react';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {useCreateRecipe} from '@/services/recipes';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {RecipeForm, RecipeFormHandle} from '@/shared/RecipeForm';
import {notifyError} from '@/utils/notification';

type RecipeCreateDrawerProps = {
    // State-based mode (when used as nested drawer)
    onClose?: () => void;
    onSuccess?: (recipeId: string) => void;
};

const RecipeCreateDrawer = ({onClose: onCloseProp, onSuccess}: RecipeCreateDrawerProps) => {
    const {closeDrawer} = useParamsDrawer({});
    const recipeFormRef = useRef<RecipeFormHandle<'create'>>(null);
    const [createRecipe, {isLoading}] = useCreateRecipe();

    // Support both state-based and params-based modes
    const isStateBased = !!onCloseProp;
    const handleClose = isStateBased ? onCloseProp : closeDrawer;

    const handleRecipeCreate = async () => {
        try {
            await recipeFormRef.current?.submit();
            // Form submission happens in onSubmit below
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    const handleFormSubmit = async (values: any) => {
        try {
            const result = await createRecipe(values).unwrap();
            const recipeId = result?.id;

            // If onSuccess callback is provided (state-based mode), call it
            if (onSuccess && recipeId) {
                onSuccess(recipeId);
            } else {
                // Otherwise close the drawer (params-based mode)
                handleClose();
            }
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
            throw error; // Re-throw to prevent closing drawer on error
        }
    };

    return (
        <AutoDrawer
            actions={
                <Group w="100%">
                    <Button
                        color="orange"
                        flex={1}
                        loading={isLoading}
                        onClick={handleRecipeCreate}
                        radius="xl"
                        size="sm"
                        variant="light"
                    >
                        Save
                    </Button>
                </Group>
            }
            content={
                <RecipeForm
                    onSubmit={handleFormSubmit}
                    ref={recipeFormRef}
                />
            }
            onClose={handleClose}
            title="Create Recipe"
        />
    );
};

export default RecipeCreateDrawer;
