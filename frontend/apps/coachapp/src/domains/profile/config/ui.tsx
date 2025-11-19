import {Icon, IconBuilding, IconCards, IconChalkboard, IconHeadphones} from '@tabler/icons-react';

export type LegalLink = {
    id: string;
    label: string;
    link: string;
};

export type ActionGridItem = {
    id: string;
    label: string;
    icon: Icon;
};

export type ActionGridConfig = ActionGridItem[];

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

export const ACTION_GRID_CONFIG: ActionGridConfig = [
    {id: 'coach_profile', label: 'Profile', icon: IconChalkboard},
    {id: 'business', label: 'Business', icon: IconBuilding},
    {id: 'subscription', label: 'Subscription', icon: IconCards},
    {id: 'help_center', label: 'Help Center', icon: IconHeadphones},
];
