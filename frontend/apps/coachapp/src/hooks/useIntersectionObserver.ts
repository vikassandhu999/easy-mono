import React from 'react';

export default function useIntersectionObserver({
    root,
    target,
    onIntersect,
    threshold = 1,
    rootMargin = '0px',
    enabled = true,
}: any) {
    React.useEffect(() => {
        if (!enabled) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => entries.forEach((entry) => entry.isIntersecting && onIntersect()),
            {
                root: root && root.current,
                rootMargin,
                threshold,
            },
        );

        const element = target && target.current;

        if (!element) {
            return;
        }

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [enabled, root, rootMargin, threshold, target, onIntersect]);
}
