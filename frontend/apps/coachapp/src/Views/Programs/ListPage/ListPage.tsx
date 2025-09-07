import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router';
import {IconPlus, IconTrendingUp} from '@tabler/icons-react';
import {usePrograms} from '@/Hooks/useProgramQueries';
import ListItem from './ListItem';
import Header from './Header';
import {EmptyState} from '@/Components/layouts/EmptyState';
import RecordsList from '@/Components/layouts/RecordsList';
import {Program} from '@/Api/Programs';
import {Button} from '@mantine/core';
import PagePaper from '@/Components/Containers/PagePaper';
import PaddingContainer from '@/Components/Containers/PaddingContainer';
import {useDrawerStack} from '@/Providers/StackProvider';

function ProgramListPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const stack = useDrawerStack();

    const {data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage} = usePrograms({
        search: search?.trim(),
    });

    const allPrograms = useMemo(() => data?.pages.flatMap((page) => page.records) ?? [], [data]);
    const totalPrograms = data?.pages[0]?.total ?? 0;

    const handleEdit = (id: string) => navigate(`/programs/${id}/edit`);
    const handleView = (id: string) => navigate(`/programs/${id}`);

    return (
        <PagePaper>
            {/* Header with consistent padding */}

            <Header
                totalPrograms={totalPrograms}
                onSearchChange={(value) => setSearch(value)}
                isLoading={isLoading}
            />

            <PaddingContainer
                paddingX={'lg'}
                paddingY={'md'}
            >
                <RecordsList<Program>
                    gap="sm"
                    records={allPrograms}
                    hasNextPage={hasNextPage}
                    fetchNextPage={fetchNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    renderItem={(program) => (
                        <ListItem
                            key={program.id}
                            program={program}
                            onEdit={handleEdit}
                            onView={handleView}
                        />
                    )}
                    emptyState={
                        <EmptyState
                            icon={<IconTrendingUp size={32} />}
                            title={search ? 'Couldn’t find any programs' : 'Ready to Build a Program?'}
                            description={
                                search
                                    ? 'Try adjusting your search terms or create a new program'
                                    : `Every great training plan starts here. Create your first program to begin transforming your clients' fitness journeys.`
                            }
                            action={
                                <Button
                                    leftSection={<IconPlus size={16} />}
                                    onClick={() => stack.open('create-program')}
                                    size="md"
                                    variant="filled"
                                    radius={9999}
                                    my="lg"
                                >
                                    Create Program
                                </Button>
                            }
                            iconColor="gray.5"
                            iconSize="xl"
                        />
                    }
                    loadMoreText="Load More Programs"
                    itemKey={(item) => item.id}
                />
            </PaddingContainer>
        </PagePaper>
    );
}

export default ProgramListPage;
