import '@fontsource-variable/inter';
import '@fontsource-variable/roboto-mono';
import '@fontsource-variable/nunito';
import '@fontsource-variable/dm-sans';
import '@mantine/core/styles.css';
import {
    Anchor,
    AppShell,
    Autocomplete,
    Button,
    Card,
    createTheme,
    Drawer,
    Modal,
    MultiSelect,
    Notification,
    NumberInput,
    PasswordInput,
    SegmentedControl,
    Select,
    Switch,
    Table,
    Tabs,
    TagsInput,
    Textarea,
    TextInput,
} from '@mantine/core';

import './default-css-variables.css';
import inputClasses from './input.module.css';
import segmentedControllClasses from './overrides/segmented-control.module.css';

export const theme = createTheme({
    fontFamily: "'DM Sans Variable', sans-serif",
    fontFamilyMonospace: 'var(--mantine-font-family-monospace)',

    spacing: {
        xs: 'var(--ce-space-4)',
        sm: 'var(--ce-space-8)',
        md: 'var(--ce-space-12)',
        lg: 'var(--ce-space-16)',
        xl: 'var(--ce-space-20)',
    },
    radius: {
        xs: 'var(--ce-space-4)',
        sm: 'var(--ce-space-8)',
        md: 'var(--ce-space-12)',
        lg: 'var(--ce-space-16)',
        xl: 'var(--ce-space-20)',
    },
    fontSizes: {
        xs: 'var(--ce-font-size-tiny)',
        sm: 'var(--ce-font-size-tiny)',
        md: 'var(--ce-font-size-small)',
        lg: 'var(--ce-font-size-small)',
        xl: 'var(--ce-font-size-small)',
    },
    lineHeights: {
        xs: 'var(--ce-line-height-tiny)',
        sm: 'var(--ce-line-height-tiny)',
        md: 'var(--ce-line-height-small)',
        lg: 'var(--ce-line-height-small)',
        xl: 'var(--ce-line-height-small)',
    },
    shadows: {
        xs: 'var(--ce-shadow-raised)',
        sm: 'var(--ce-shadow-raised)',
        md: 'var(--ce-shadow-raised)',
        lg: 'var(--ce-shadow-raised)',
        xl: 'var(--ce-shadow-raised)',
    },
    headings: {
        fontFamily: 'var(--mantine-font-family-headings)',
        fontWeight: '600',
        sizes: {
            h1: {fontSize: 'var(--ce-font-size-display)', lineHeight: 'var(--ce-line-height-display)'},
            h2: {fontSize: 'var(--ce-font-size-h1)', lineHeight: 'var(--ce-line-height-h1)'},
            h3: {fontSize: 'var(--ce-font-size-h2)', lineHeight: 'var(--ce-line-height-h2)'},
            h4: {fontSize: 'var(--ce-font-size-h3)', lineHeight: 'var(--ce-line-height-h3)'},
            h5: {fontSize: 'var(--ce-font-size-h4)', lineHeight: 'var(--ce-line-height-h4)'},
            h6: {fontSize: 'var(--ce-font-size-h5)', lineHeight: 'var(--ce-line-height-h5)'},
        },
    },

    defaultRadius: 'md',
    cursorType: 'pointer',
    respectReducedMotion: true,

    components: {
        Anchor: Anchor.extend({
            defaultProps: {
                underline: 'always',
            },
            styles: {
                root: {
                    color: 'var(--mantine-color-brand-7)',
                    textUnderlineOffset: '3px',
                    textDecorationThickness: '1px',
                    '&:hover': {
                        color: 'var(--mantine-color-brand-8)',
                    },
                    '&:focus-visible': {
                        outline: 'none',
                        boxShadow: 'var(--shadow-focus-brand)',
                        borderRadius: 'var(--radius-sm)',
                    },
                },
            },
        }),
        AppShell: AppShell.extend({
            styles: {
                main: {
                    backgroundColor: 'var(--surface-secondary)',
                },
            },
        }),

        Button: Button.extend({}),

        SegmentedControl: SegmentedControl.extend({
            classNames: segmentedControllClasses,
        }),

        Card: Card.extend({
            defaultProps: {
                radius: 'lg',
                padding: 'md',
            },
            styles: {
                root: {
                    backgroundColor: 'var(--surface-primary)',
                    boxShadow: 'var(--shadow-sm)',
                },
            },
        }),

        TextInput: TextInput.extend({
            classNames: inputClasses,
            defaultProps: {
                size: 'md',
            },
        }),

        PasswordInput: PasswordInput.extend({
            classNames: inputClasses,
            defaultProps: {
                size: 'md',
            },
        }),

        NumberInput: NumberInput.extend({
            classNames: inputClasses,
            defaultProps: {
                size: 'md',
            },
        }),

        Textarea: Textarea.extend({
            classNames: inputClasses,
            defaultProps: {
                size: 'md',
            },
        }),

        Select: Select.extend({
            classNames: inputClasses,
            defaultProps: {
                size: 'md',
            },
        }),

        Autocomplete: Autocomplete.extend({
            classNames: inputClasses,
            defaultProps: {
                size: 'md',
            },
        }),

        MultiSelect: MultiSelect.extend({
            classNames: inputClasses,
            defaultProps: {
                size: 'md',
            },
        }),

        Switch: Switch.extend({
            classNames: inputClasses,
            defaultProps: {
                size: 'md',
            },
        }),
        TagsInput: TagsInput.extend({
            classNames: inputClasses,
            defaultProps: {
                size: 'md',
            },
        }),

        Tabs: Tabs.extend({}),

        Table: Table.extend({
            styles: {
                th: {
                    fontSize: 'var(--text-xs)',
                    textTransform: 'none',
                    letterSpacing: 'var(--tracking-wide)',
                    color: 'var(--mantine-color-text-secondary)',
                },
            },
        }),

        Drawer: Drawer.extend({
            defaultProps: {
                radius: 'lg',
            },
        }),

        Modal: Modal.extend({
            defaultProps: {
                radius: 'lg',
                centered: true,
            },
        }),

        Notification: Notification.extend({
            styles: {
                root: {
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                },
            },
        }),
    },
});
