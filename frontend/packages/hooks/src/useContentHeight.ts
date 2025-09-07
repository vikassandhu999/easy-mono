import {useState, useCallback, useEffect, useRef, useLayoutEffect} from 'react';

// Debounce utility to prevent excessive calculations
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: unknown[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    }) as T;
}

export function useContentHeight() {
    const [contentHeight, setContentHeight] = useState(0);
    const [topHeight, setTopHeight] = useState(0);
    const [bottomHeight, setBottomHeight] = useState(0);

    const observer = useRef<ResizeObserver | null>(null);
    const top = useRef<HTMLElement[]>([]);
    const bottom = useRef<HTMLElement[]>([]);
    const isCalculating = useRef(false);

    const calculateHeights = useCallback(() => {
        if (isCalculating.current) return;

        isCalculating.current = true;
        requestAnimationFrame(() => {
            try {
                const windowHeight = window.innerHeight;

                const topStaticHeight = top.current.reduce((sum, ele) => {
                    return sum + (ele?.offsetHeight || 0);
                }, 0);

                const bottomStaticHeight = bottom.current.reduce((sum, ele) => {
                    return sum + (ele?.offsetHeight || 0);
                }, 0);

                const newContentHeight = Math.max(0, windowHeight - topStaticHeight - bottomStaticHeight);

                setTopHeight(topStaticHeight);
                setBottomHeight(bottomStaticHeight);
                setContentHeight(newContentHeight);
            } finally {
                isCalculating.current = false;
            }
        });
    }, []);

    // Debounced version to prevent excessive calculations
    const debouncedCalculateHeights = useCallback(() => {
        const debouncedFn = debounce(calculateHeights, 16); // ~60fps
        return debouncedFn();
    }, [calculateHeights]);

    // Handle window resize events
    useEffect(() => {
        const handleWindowResize = () => {
            debouncedCalculateHeights();
        };

        window.addEventListener('resize', handleWindowResize, {passive: true});

        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, [debouncedCalculateHeights]);

    // Initialize ResizeObserver and handle element observations
    useEffect(() => {
        const handleObservedResize = () => {
            debouncedCalculateHeights();
        };

        observer.current = new ResizeObserver(handleObservedResize);

        return () => {
            if (observer.current) {
                observer.current.disconnect();
                observer.current = null;
            }
            // Clean up element arrays on unmount
            top.current = [];
            bottom.current = [];
        };
    }, [debouncedCalculateHeights]);

    // Initial calculation after DOM is ready
    useLayoutEffect(() => {
        calculateHeights();
    }, [calculateHeights]);

    const useElementRef = useCallback(
        (pos: 'top' | 'bottom' = 'top') => {
            return (node: HTMLElement | null) => {
                const list = pos === 'top' ? top : bottom;

                if (!node) {
                    // Node is being unmounted, no need to do anything
                    // The cleanup will happen when the element is naturally removed
                    return;
                }

                // Check if element is already tracked
                const existingIndex = list.current.findIndex((el) => el === node);

                if (existingIndex === -1) {
                    // Add new element
                    list.current.push(node);
                    observer.current?.observe(node);

                    // Schedule height calculation
                    debouncedCalculateHeights();
                }
            };
        },
        [debouncedCalculateHeights],
    );

    // Cleanup function to manually remove an element (if needed)
    const removeElement = useCallback(
        (element: HTMLElement, pos: 'top' | 'bottom' = 'top') => {
            const list = pos === 'top' ? top : bottom;
            const index = list.current.findIndex((el) => el === element);

            if (index !== -1) {
                list.current.splice(index, 1);
                observer.current?.unobserve(element);
                debouncedCalculateHeights();
            }
        },
        [debouncedCalculateHeights],
    );

    return {
        contentHeight,
        topHeight,
        bottomHeight,
        useElementRef,
        removeElement,
    };
}
