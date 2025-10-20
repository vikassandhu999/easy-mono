import {useState} from 'react';
import {useSearchParams} from 'react-router';

import {ContentListView} from '@/components/Content';
import {Content} from '@/store/services/contents';

const ExerciseListPage = () => {
    const [refreshKey] = useState(0);
    const [, setSearchParams] = useSearchParams();

    const handleExerciseClick = (exercise: Content) => {
        setSearchParams({selected_drawer: 'edit_exercise', exercise_id: exercise.id});
    };

    return (
        <ContentListView
            key={refreshKey}
            onContentClick={handleExerciseClick}
        />
    );
};

export default ExerciseListPage;
