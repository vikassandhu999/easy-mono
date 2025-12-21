import {Icon, IconBuilding, IconChalkboard, IconCreditCard} from '@tabler/icons-react';

export type LegalLink = {
    id: string;
    label: string;
    link: string;
};

export type ActionGridItem = {
    id: string;
    label: string;
    icon: Icon;
    color?: string;
};

export type ActionGridConfig = ActionGridItem[];

const WEBSITE_URL = 'https://coacheasyapp.com';

export const LEGAL_LINKS: LegalLink[] = [
    {
        id: 'about_us',
        label: 'About Us',
        link: `${WEBSITE_URL}/about`,
    },
    {
        id: 'privacy_policy',
        label: 'Privacy Policy',
        link: `${WEBSITE_URL}/privacy`,
    },
    {
        id: 'terms_of_use',
        label: 'Terms of Use',
        link: `${WEBSITE_URL}/terms`,
    },
    {
        id: 'support',
        label: 'Contact Support',
        link: `${WEBSITE_URL}/support`,
    },
    {
        id: 'bug_report',
        label: 'Report a Bug',
        link: 'https://coacheasy.notion.site/29338d91a7b880a7808acdab65799f0a?pvs=105',
    },
    {
        id: 'feature_request',
        label: 'Request Feature',
        link: 'https://coacheasy.notion.site/29338d91a7b880109e0fef65910b1249?pvs=105',
    },
    {
        id: 'whatsapp',
        label: 'Join WhatsApp Community',
        link: 'https://chat.whatsapp.com/J2KRTVSsTS48wNi3gx1nsp',
    },
];

export const ACTION_GRID_CONFIG: ActionGridConfig = [
    {id: 'coach_profile', label: 'My Profile', icon: IconChalkboard, color: 'blue'},
    {id: 'business', label: 'Business', icon: IconBuilding, color: 'green'},
    {id: 'subscription', label: 'Subscription', icon: IconCreditCard, color: 'violet'},
];
