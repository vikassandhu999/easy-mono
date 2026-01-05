import {Box, Group} from '@mantine/core';
import {useLocation} from 'react-router';

import {NavItem} from '../types';
import classes from './NavItemButton.module.css';

interface NavItemButtonProps {
  item: NavItem;
  onNavigate: (href: string) => void;
}

export function NavItemButton({item, onNavigate}: NavItemButtonProps) {
  const location = useLocation();
  const Icon = item.icon;

  const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));

  return (
    <Box
      className={classes.button}
      component="button"
      data-active={isActive ? 'true' : 'false'}
      onClick={() => onNavigate(item.href)}
    >
      <Icon size={24} />
      <span>{item.label}</span>
    </Box>
  );
}
