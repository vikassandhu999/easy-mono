import {modals} from '@mantine/modals';
import {useState} from 'react';

import {Content} from '@/api/contents';
import {ContentListView} from '@/components/Content';
import {ContentBuilder} from '@/components/ContentBuilder';

const ExerciseListPage = () => {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleExerciseClick = (exercise: Content) => {
        modals.open({
            modalId: 'exercise-detail',
            title: exercise.name,
            centered: true,
            size: 'xl',
            styles: {
                body: {
                    padding: 0,
                },
                title: {
                    fontWeight: 600,
                    fontSize: 'var(--mantine-font-size-lg)',
                },
            },
            children: (
                <ContentBuilder
                    contentId={exercise.id}
                    onComplete={() => {
                        modals.close('exercise-detail');
                        setRefreshKey((prev) => prev + 1);
                    }}
                    showSaveOptions
                />
            ),
        });
    };

    return (
        <ContentListView
            key={refreshKey}
            onContentClick={handleExerciseClick}
        />
    );
};

export default ExerciseListPage;
