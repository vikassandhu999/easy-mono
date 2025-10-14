import {useState} from 'react';

import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';

import ExerciseListPage from './exercise/ExerciseListPage';
import RecipeListPage from './recipe/RecipeListPage';

type ContentType = 'exercise' | 'recipe';

export default function LibraryPage() {
    const [selectedTab] = useState<ContentType>('exercise');

    return (
        <PagePaper>
            <PaddingContainer
                paddingX={'lg'}
                paddingY={0}
                style={{
                    paddingTop: 'var(--ce-size-md)',
                    paddingBottom: 'var(--ce-size-xl)',
                }}
            >
                {selectedTab === 'exercise' && <ExerciseListPage />}
                {selectedTab === 'recipe' && <RecipeListPage />}
            </PaddingContainer>
        </PagePaper>
    );
}
