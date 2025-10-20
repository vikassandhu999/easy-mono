import {useSearchParams} from 'react-router';

import {ContentListView} from '@/components/Content';
import {Content} from '@/store/services/contents';

const RecipeListPage = () => {
    const [, setSearchParams] = useSearchParams();

    const handleRecipeClick = (recipe: Content) => {
        setSearchParams({selected_drawer: 'edit_recipe', recipe_id: recipe.id});
    };

    return <ContentListView onContentClick={handleRecipeClick} />;
};

export default RecipeListPage;
