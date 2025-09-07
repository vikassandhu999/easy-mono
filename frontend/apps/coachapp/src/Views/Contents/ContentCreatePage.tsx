import {useNavigate} from 'react-router';
import {notifications} from '@mantine/notifications';
import {CreateContentProps} from '@/Api/Contents';
import {useContentMutations} from '@/Hooks/useContentsQueries';
import {ContentForm} from '@/Components/ContentForm';

export default function ContentCreatePage() {
    const navigate = useNavigate();
    const {createContent, isCreating} = useContentMutations();

    const handleSubmit = (data: CreateContentProps) => {
        // Ensure required domain fields exist
        const payload: CreateContentProps = {
            name: data.name.trim(),
            type: data.type || 'exercise',
            instructions: data.instructions || '',
            media: data.media,
            thumbnail_url: data.thumbnail_url || undefined,
        };

        createContent(payload, {
            onSuccess: (resp: {id: string}) => {
                notifications.show({
                    title: 'Success',
                    message: 'Content created successfully',
                    color: 'green',
                    autoClose: 1000,
                });
                navigate(`/content/${resp.id}`);
            },
            onError: () => {
                notifications.show({
                    title: 'Error',
                    message: 'Failed to create content',
                    color: 'red',
                    autoClose: 1000,
                });
            },
        });
    };

    const handleCancel = () => {
        navigate('/content');
    };

    return (
        <ContentForm
            initialData={null}
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isCreating}
        />
    );
}
