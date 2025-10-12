import {useNavigate} from 'react-router';

import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import Header from '@/components/layouts/Header';
import {SessionBuilder} from '@/components/SessionBuilder';

export default function CreateSessionPage() {
    const navigate = useNavigate();
    return (
        <>
            <HeadingContainer paddingX={'sm'}>
                <Header
                    onBack={() => navigate(-1)}
                    title={'Create Workout'}
                />
            </HeadingContainer>
            <PagePaper>
                <PaddingContainer paddingX="sm">
                    <SessionBuilder sessionType={'workout'} />
                </PaddingContainer>
            </PagePaper>
        </>
    );
}
