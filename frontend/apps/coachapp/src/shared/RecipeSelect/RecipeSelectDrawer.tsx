import {Button} from '@mantine/core';
import {FC, useRef} from 'react';

import {Recipe} from '@/services/recipes';
import AutoDrawer from '@/shared/AutoDrawer';

import RecipeSelect from './RecipeSelect';

interface RecipeSelectDrawerProps {
    multiple?: boolean;
    onClose: () => void;
    onComplete?: (selectedIds: string[], selectedRecipes?: Recipe[]) => void;
}

const RecipeSelectDrawer: FC<RecipeSelectDrawerProps> = ({multiple = true, onClose, onComplete}) => {
    const recipeSelectRef = useRef(null);

    const handleComplete = (selectedIds: string[], selectedRecipes?: Recipe[]) => {
        onComplete?.(selectedIds, selectedRecipes);
        onClose();
    };

    const handleSelectClick = () => {
        if (multiple) {
            recipeSelectRef.current?.handleSave();
        }
    };

    return (
        <AutoDrawer
            actions={
                multiple ? (
                    <Button
                        onClick={handleSelectClick}
                        radius="lg"
                        size="sm"
                    >
                        Select
                    </Button>
                ) : null
            }
            content={
                <RecipeSelect
                    multiple={multiple}
                    onComplete={handleComplete}
                    ref={recipeSelectRef}
                />
            }
            onClose={onClose}
            title={`Select Recipe${multiple ? 's' : ''}`}
        />
    );
};

export default RecipeSelectDrawer;
