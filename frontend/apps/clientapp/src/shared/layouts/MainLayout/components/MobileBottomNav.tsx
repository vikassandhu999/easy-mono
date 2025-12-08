import {useLayoutEffect, useRef} from 'react';

import {NavItem} from '../types';
import classes from './MobileBottomNav.module.css';
import {MobileNavItem} from './MobileNavItem';

interface MobileBottomNavProps {
    isVisible: boolean;
    navItems: NavItem[];
    onNavigate: (href: string) => void;
}

export function MobileBottomNav({isVisible, navItems, onNavigate}: MobileBottomNavProps) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (ref.current) {
            const bottom = ref.current.getBoundingClientRect().bottom;
            document.body.style.setProperty('--ce-appbar-height', `calc(${window.innerHeight - bottom}px)`);
        }

        return () => {
            document.body.style.removeProperty('--ce-appbar-height');
        };
    }, []);

    return (
        <nav
            className={classes.root}
            data-visible={isVisible}
            ref={ref}
        >
            <div className={classes.navGrid}>
                {navItems.map((item) => (
                    <MobileNavItem
                        item={item}
                        key={item.href}
                        onNavigate={onNavigate}
                    />
                ))}
            </div>
        </nav>
    );
}
