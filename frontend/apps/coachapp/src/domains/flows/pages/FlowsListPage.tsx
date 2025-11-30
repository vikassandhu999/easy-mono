import {Stack} from '@mantine/core';

import PagePaper from '@/shared/containers/PagePaper';

// import BrandingSettings from '../components/BrandingSettings';
import PublicJoinSettings from '../components/PublicJoinSettings';
import classes from './styles.module.css';

const FlowsListPage = () => {
    return (
        <PagePaper bottomGutter>
            <div className={classes.pageContainer}>
                {/* Header */}
                <div className={classes.headerSection}>
                    <div className={classes.headerRow}>
                        <div className={classes.headerContent}>
                            <h1 className={classes.pageTitle}>Client Onboarding</h1>
                            <p className={classes.pageDescription}>
                                Configure how clients can join your coaching practice and customize your public page
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className={classes.contentSection}>
                    <Stack gap="lg">
                        {/* Public Join Settings */}
                        <PublicJoinSettings />

                        {/* Branding Settings */}
                        {/* <BrandingSettings /> */}
                    </Stack>
                </div>
            </div>
        </PagePaper>
    );
};

export default FlowsListPage;
