import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';

import ExerciseListPage from './exercise/ExerciseListPage';

export default function LibraryPage() {
    return (
        <PagePaper>
            <PaddingContainer
                paddingX={'xs'}
                paddingY={'lg'}
            >
                <ExerciseListPage />
            </PaddingContainer>
        </PagePaper>
    );
}
