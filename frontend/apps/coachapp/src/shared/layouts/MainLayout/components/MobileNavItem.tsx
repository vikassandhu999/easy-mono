import {useLocation} from 'react-router';

import {NavItem} from '../types';
import classes from './MobileNavItem.module.css';

interface MobileNavItemProps {
    item: NavItem;
    onNavigate: (href: string) => void;
}

export function MobileNavItem({item, onNavigate}: MobileNavItemProps) {
    const location = useLocation();
    const Icon = item.icon;

    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));

    return (
        <button
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            className={classes.button}
            data-active={isActive}
            onClick={() => onNavigate(item.href)}
            type="button"
        >
            <Icon size={20} />
            <span className={classes.label}>{item.label}</span>
            {item.badge && <span className={classes.badge}>{item.badge}</span>}
        </button>
    );
}
