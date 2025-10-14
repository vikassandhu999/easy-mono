import {modals} from '@mantine/modals';

import {Content} from '@/api/contents';
import {ContentListView} from '@/components/Content';
import {ContentBuilder} from '@/components/ContentBuilder';

const RecipeListPage = () => {
    const handleRecipeClick = (recipe: Content) => {
        modals.open({
            modalId: `edit-recipe-${recipe.id}`,
            title: 'Edit Recipe',
            size: 'xl',
            centered: true,
            styles: {
                body: {padding: 0},
            },
            fullScreen: true,
            children: (
                <ContentBuilder
                    contentId={recipe.id}
                    contentType="recipe"
                    onComplete={() => {
                        modals.close(`edit-recipe-${recipe.id}`);
                    }}
                    showSaveOptions
                />
            ),
        });
    };

    return <ContentListView onContentClick={handleRecipeClick} />;
};

export default RecipeListPage;
