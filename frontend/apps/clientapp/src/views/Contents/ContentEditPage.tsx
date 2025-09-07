import {useNavigate, useParams} from 'react-router';
import {LoadingOverlay} from '@mantine/core';
import {useContent, useContentMutations} from '@/Hooks/useContentsQueries';
import {UpdateContentProps} from '@/Api/Contents';
import {ContentForm} from '@/Components/ContentForm';
import {notifications} from '@mantine/notifications';
import PagePaper from '@/Components/Containers/PagePaper';
import HeadingContainer from '@/Components/Containers/HeaderContainer';
import PaddingContainer from '@/Components/Containers/PaddingContainer';

export default function ContentEditPage() {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();

    const {data: content, isLoading: contentLoading} = useContent(id!);
    const {updateContent, isUpdating} = useContentMutations();

    const handleSubmit = (data: UpdateContentProps) => {
        if (id) {
            updateContent(
                {id, data},
                {
                    onSuccess: () => {
                        notifications.show({
                            title: 'Success',
                            message: 'Content updated successfully',
                            color: 'green',
                            autoClose: 1000,
                        });
                        navigate(`/content/${id}`);
                    },
                    onError: () => {
                        notifications.show({
                            title: 'Error',
                            message: 'Failed to update content',
                            color: 'red',
                            autoClose: 1000,
                        });
                    },
                },
            );
        }
    };

    const handleCancel = () => {
        navigate(`/content/${id}`);
    };

    if (contentLoading) {
        return (
            <PagePaper>
                <HeadingContainer paddingY={'xs'}>
                    <div>Loading...</div>
                </HeadingContainer>
                <PaddingContainer>
                    <div style={{position: 'relative', minHeight: 400}}>
                        <LoadingOverlay visible />
                    </div>
                </PaddingContainer>
            </PagePaper>
        );
    }

    return (
        <ContentForm
            initialData={content}
            mode={'edit'}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isUpdating}
        />
    );
}
