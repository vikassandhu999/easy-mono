import PageTitle from '@/components/PageTitle';
import PageWrapper from '@/containers/PageWrapper';
import PaddingContainer from '@/shared/containers/PaddingContainer';

const ClientsPage: React.FC = () => {
    return (
        <PageWrapper>
            <PaddingContainer>
                <PageTitle>Clients</PageTitle>
            </PaddingContainer>
        </PageWrapper>
    );
};

export default ClientsPage;
