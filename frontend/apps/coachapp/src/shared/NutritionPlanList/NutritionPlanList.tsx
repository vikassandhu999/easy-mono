import {Loader} from '@mantine/core';
import {useIntersection} from '@mantine/hooks';
import {IconCalendarWeek, IconCaretRight, IconLayoutList, IconSalad} from '@tabler/icons-react';
import {useCallback, useEffect, useMemo, useRef} from 'react';

import PlanSampleImage from '@/../public/empty_plan.png';
import {NutritionPlan, useListNutritionPlans} from '@/services/nutrition_plans';

import classes from './styles.module.css';

interface NutritionPlanListItemProps {
    onClick?: (id: string) => void;
    plan: NutritionPlan;
}

const NutritionPlanListItem = ({plan, onClick}: NutritionPlanListItemProps) => {
    const mealsCount = plan.meals?.length ?? 0;

    return (
        <div
            className={classes.planCard}
            onClick={() => onClick?.(plan.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.(plan.id);
                }
            }}
            role="button"
            tabIndex={0}
        >
            {/* Plan Image */}
            <div className={classes.imageWrapper}>
                <img
                    alt={plan.name}
                    className={classes.image}
                    src={plan.thumbnail_url || PlanSampleImage}
                />
                {plan.is_template && (
                    <span className={classes.templateBadge}>Template</span>
                )}
            </div>

            {/* Plan Content */}
            <div className={classes.content}>
                <span className={classes.name}>{plan.name}</span>
                {plan.description && (
                    <span className={classes.description}>{plan.description}</span>
                )}
                <div className={classes.metaTags}>
                    {plan.duration_weeks && (
                        <span className={`${classes.metaTag} ${classes.metaTagDuration}`}>
                            <IconCalendarWeek size={11} />
                            {plan.duration_weeks} {plan.duration_weeks === 1 ? 'week' : 'weeks'}
                        </span>
                    )}
                    {mealsCount > 0 && (
                        <span className={`${classes.metaTag} ${classes.metaTagMeals}`}>
                            <IconSalad size={11} />
                            {mealsCount} {mealsCount === 1 ? 'meal' : 'meals'}
                        </span>
                    )}
                    {plan.tags?.slice(0, 2).map((tag) => (
                        <span
                            className={`${classes.metaTag} ${classes.customTag}`}
                            key={tag}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Arrow indicator */}
            <IconCaretRight
                className={classes.arrow}
                size={18}
            />
        </div>
    );
};

/* Skeleton loader for better perceived performance */
const NutritionPlanListSkeleton = () => (
    <>
        {[1, 2, 3].map((i) => (
            <div
                className={classes.skeleton}
                key={i}
            >
                <div className={classes.skeletonImage} />
                <div className={classes.skeletonContent}>
                    <div className={classes.skeletonLine} />
                    <div className={classes.skeletonLine} />
                    <div className={classes.skeletonTags}>
                        <div className={classes.skeletonTag} />
                        <div className={classes.skeletonTag} />
                    </div>
                </div>
            </div>
        ))}
    </>
);

export interface NutritionPlanListProps {
    clientId?: string;
    onPlanClick?: (id: string) => void;
    search?: string;
}

const NutritionPlanList = ({onPlanClick, search}: NutritionPlanListProps) => {
    const lastCallTimeRef = useRef(0);
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListNutritionPlans({
        search: search || undefined,
        is_template: clientId ? undefined : true,
        client_id: clientId,
    });

    const plans = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    // Intersection observer for infinite scroll
    const {entry, ref} = useIntersection({
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
    });

    // Throttled fetch for infinite scroll
    const handleFetchNextPage = useCallback(() => {
        const now = Date.now();
        if (now - lastCallTimeRef.current > 500 && hasNextPage && !isFetchingNextPage) {
            lastCallTimeRef.current = now;
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        if (entry?.isIntersecting) {
            handleFetchNextPage();
        }
    }, [entry?.isIntersecting, handleFetchNextPage]);

    // Loading state
    if (isLoading) {
        return (
            <div className={classes.listContainer}>
                <NutritionPlanListSkeleton />
            </div>
        );
    }

    // Empty state
    if (plans.length === 0) {
        return (
            <div className={classes.emptyState}>
                <IconLayoutList
                    className={classes.emptyIcon}
                    size={48}
                    stroke={1.5}
                />
                <span className={classes.emptyText}>
                    {search ? 'No plans match your search' : 'No nutrition plans yet'}
                </span>
                <span className={classes.emptyHint}>
                    {search ? 'Try a different search term' : 'Create your first nutrition plan to get started'}
                </span>
            </div>
        );
    }

    return (
        <div className={classes.listContainer}>
            {plans.map((plan) => (
                <NutritionPlanListItem
                    key={plan.id}
                    onClick={onPlanClick}
                    plan={plan}
                />
            ))}

            {/* Infinite scroll trigger */}
            {hasNextPage && (
                <div
                    className={classes.loadMoreTrigger}
                    ref={ref}
                >
                    {isFetchingNextPage && <Loader size="sm" />}
                </div>
            )}
        </div>
    );
};

export default NutritionPlanList;
