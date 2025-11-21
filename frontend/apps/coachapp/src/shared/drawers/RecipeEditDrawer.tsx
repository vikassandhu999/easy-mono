import {Button} from '@mantine/core';
import {useRef} from 'react';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {useUpdateRecipe} from '@/services/recipes';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {RecipeForm, RecipeFormHandle} from '@/shared/RecipeForm';
import APIErrorParser from '@/utils/error_parser';
import {notifyError, notifySuccess} from '@/utils/notification';

const RecipeEditDrawer = () => {
    const {closeDrawer, getDrawerParams} = useParamsDrawer({});
    const recipeFormRef = useRef<RecipeFormHandle<'update'>>(null);
    const [updateRecipe, {isLoading}] = useUpdateRecipe();

    const params = getDrawerParams();
    const recipeId = params.recipe_id;

    if (!recipeId) {
        return null;
    }

    const handleSubmit = async () => {
        await recipeFormRef.current?.submit();
    };

    return (
        <AutoDrawer
            actions={
                <Button
                    color="green"
                    fullWidth
                    loading={isLoading}
                    onClick={handleSubmit}
                    radius="xl"
                    size="sm"
                    variant="light"
                >
                    Save
                </Button>
            }
            content={
                <RecipeForm
                    onSubmit={async (values) => {
                        try {
                            await updateRecipe(values).unwrap();

                            notifySuccess('Recipe updated successfully');

                            closeDrawer();
                        } catch (error) {
                            const err_message = new APIErrorParser(error).humanize();
                            notifyError(err_message);
                        }
                    }}
                    recipeId={recipeId}
                    ref={recipeFormRef}
                />
            }
            onClose={closeDrawer}
            title="Edit Recipe"
        />
    );
};

export default RecipeEditDrawer;
