import {modals} from '@mantine/modals';

import {Content} from '@/api/contents';
import {ContentListView} from '@/components/Content';
import {ContentBuilder} from '@/components/ContentBuilder';

const RecipeListPage = () => {
    const handleRecipeClick = (recipe: Content) => {
        modals.open({
            modalId: `edit-recipe-${recipe.id}`,
            title: 'Edit Recipe',
            centered: true,
            styles: {
                body: {padding: 0},
            },
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

    return (
        <ContentListView
            contentType="recipe"
            onContentClick={handleRecipeClick}
        />
    );
};

export default RecipeListPage;
