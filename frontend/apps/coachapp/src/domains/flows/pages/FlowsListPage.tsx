import PagePaper from '@/shared/containers/PagePaper';

import classes from './styles.module.css';

const FlowsListPage = () => {
    return (
        <PagePaper bottomGutter>
            <div className={classes.pageContainer}>
                {/* Header */}
                <div className={classes.headerSection}>
                    <div className={classes.headerRow}>
                        <div className={classes.headerContent}>
                            <h1 className={classes.pageTitle}>Flows</h1>
                            <p className={classes.pageDescription}>
                                Create and manage intake flows to collect information from clients when they join your
                                business
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className={classes.contentSection}>
                    <div className={classes.contentList}>{/* Flows list will go here */}</div>
                </div>
            </div>
        </PagePaper>
    );
};

export default FlowsListPage;
