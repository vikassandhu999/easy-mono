import {DRAWER_KEYS} from '../config/drawer';
import useLibraryDrawer from '../hooks/useLibraryDrawer';
import ContentCreateDrawer from './ContentCreateDrawer';
import RecipeCreateDrawer from './RecipeCreateDrawer';
import RecipeUpdateDrawer from './RecipeUpdateDrawer';
import RecipeViewDrawer from './RecipeViewDrawer';

const LibraryListPageDrawers = () => {
    const {activeDrawerKey} = useLibraryDrawer();

    switch (activeDrawerKey) {
        case DRAWER_KEYS.CONTENT_CREATE:
            return <ContentCreateDrawer />;
        case DRAWER_KEYS.RECIPE_CREATE:
            return <RecipeCreateDrawer />;
        case DRAWER_KEYS.RECIPE_VIEW:
            return <RecipeViewDrawer />;
        case DRAWER_KEYS.RECIPE_EDIT:
            return <RecipeUpdateDrawer />;

        default:
            return null;
    }
};

export default LibraryListPageDrawers;
