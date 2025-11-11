import {
    Icon,
    IconAlertCircle,
    IconBuilding,
    IconCards,
    IconChalkboard,
    IconHeadphones,
    IconHeart,
} from '@tabler/icons-react';
import {ReactNode} from 'react';

export type LegalLink = {
    id: string;
    label: string;
    link: string;
};

export type AlertConfig = {
    color: string;
    icon: ReactNode;
    title: string;
    message: string;
};

export const ALERTS = {
    NO_COACH_PROFILE: {
        color: 'yellow',
        icon: <IconAlertCircle size={16} />,
        title: 'No Coach Profile',
        message: 'You do not have a coach profile associated with your account. Please contact support for assistance.',
    },
    LOAD_ERROR: {
        color: 'red',
        icon: <IconAlertCircle size={16} />,
        title: 'Error Loading Profile',
        message: 'Failed to load your coach profile. Please try again.',
    },
    BETA_FEEDBACK: {
        color: 'pink',
        icon: <IconHeart size={16} />,
        title: 'Help us improving',
        message:
            'We are in beta phase. So please help improving. Report any bug you encounter or you can ask for feature that you think can be of some value.',
    },
} as const;

export const LEGAL_LINKS: LegalLink[] = [
    {
        id: 'about_us',
        label: 'ABOUT US',
        link: '',
    },
    {
        id: 'privacy_policy',
        label: 'Privacy Policy',
        link: '',
    },
    {
        id: 'terms_of_use',
        label: 'Terms of use',
        link: '',
    },
    {
        id: 'faq',
        label: 'FAQs',
        link: '',
    },

    {
        id: 'bug_report',
        label: 'Bug Report',
        link: '',
    },
    {
        id: 'feature_request',
        label: 'Feature Request',
        link: '',
    },
];

export type ActionGridItem = {
    id: string;
    label: string;
    icon: Icon | React.ReactElement;
};

export type ActionGridConfig = ActionGridItem[];
export const ACTION_GRID_CONFIG: ActionGridConfig = [
    {id: 'coach_profile', label: 'Profile', icon: IconChalkboard},
    {id: 'business', label: 'Business', icon: IconBuilding},
    {id: 'subscription', label: 'Subscription', icon: IconCards},
    {id: 'help_center', label: 'Help Center', icon: IconHeadphones},
];
