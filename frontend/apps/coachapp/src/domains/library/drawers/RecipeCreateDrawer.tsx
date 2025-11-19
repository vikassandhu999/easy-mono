import {Button} from '@mantine/core';
import {useRef} from 'react';

import {useCreateRecipe} from '@/services/recipes';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {RecipeForm, RecipeFormHandle} from '@/shared/RecipeForm';
import APIErrorParser from '@/utils/error_parser';
import {notifyError, notifySuccess} from '@/utils/notification';

import useLibraryDrawer from '../hooks/useLibraryDrawer';

const RecipeCreateDrawer = () => {
    const {closeDrawer} = useLibraryDrawer();
    const recipeFormRef = useRef<RecipeFormHandle>(null);
    const [createRecipe, {isLoading}] = useCreateRecipe();

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
                    variant="solid"
                >
                    Save
                </Button>
            }
            content={
                <RecipeForm
                    onSubmit={async (values) => {
                        try {
                            await createRecipe(values).unwrap();

                            notifySuccess('Recipe created successfully');

                            closeDrawer();
                        } catch (error) {
                            const err_message = new APIErrorParser(error).humanize();
                            notifyError(err_message);
                        }
                    }}
                    ref={recipeFormRef}
                />
            }
            onClose={closeDrawer}
            title="Add Recipe"
        />
    );
};

export default RecipeCreateDrawer;
