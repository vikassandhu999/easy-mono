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
    Input,
    InputWrapper,
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
    Textarea,
    TextInput,
} from '@mantine/core';

type MantineSize = 'lg' | 'md' | 'sm' | 'xl' | 'xs';

const resolveButtonHeight = (size: MantineSize | undefined) => {
    switch (size) {
        case 'xs':
            return 'max(var(--button-height-xs), var(--touch-target-min))';
        case 'sm':
            return 'max(var(--button-height-sm), var(--touch-target-min))';
        case 'lg':
            return 'max(var(--button-height-lg), var(--touch-target-min))';
        case 'xl':
            return 'max(var(--button-height-xl), var(--touch-target-min))';
        case 'md':
        default:
            return 'max(var(--button-height-md), var(--touch-target-min))';
    }
};

const inputBaseStyles = {
    height: 'var(--input-height-md)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-base)',
    lineHeight: 'var(--leading-normal)',
    backgroundColor: 'var(--surface-sunken)',
    borderColor: 'var(--surface-sunken)',
    borderWidth: '6px',
    color: 'var(--mantine-color-text-primary)',
    paddingInline: 'var(--space-4)',
    transition: 'var(--transition-colors), var(--transition-shadow)',
    '&::placeholder': {
        color: 'var(--mantine-color-text-tertiary)',
        opacity: 1,
    },
    '&:focus, &:focus-within, &[data-focus]': {
        borderColor: 'var(--border-focus)',
        boxShadow: 'var(--shadow-focus-brand)',
    },
    '&[data-invalid]': {
        borderColor: 'var(--mantine-color-red-6)',
        boxShadow: 'var(--shadow-focus-error)',
    },
    '&:disabled, &[data-disabled]': {
        borderColor: 'var(--border-subtle)',
        color: 'var(--mantine-color-text-disabled)',
        cursor: 'not-allowed',
        opacity: 1,
    },
} as const;

export const theme = createTheme({
    primaryColor: 'brand',
    primaryShade: 6,

    fontFamily: "'DM Sans Variable', sans-serif",
    fontFamilyMonospace: 'var(--mantine-font-family-monospace)',

    spacing: {
        xs: 'var(--space-2)',
        sm: 'var(--space-3)',
        md: 'var(--space-4)',
        lg: 'var(--space-5)',
        xl: 'var(--space-6)',
    },
    radius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
    },
    fontSizes: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        md: 'var(--text-base)',
        lg: 'var(--text-md)',
        xl: 'var(--text-lg)',
    },
    lineHeights: {
        xs: 'var(--leading-snug)',
        sm: 'var(--leading-snug)',
        md: 'var(--leading-normal)',
        lg: 'var(--leading-relaxed)',
        xl: 'var(--leading-relaxed)',
    },
    shadows: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
    },
    headings: {
        fontFamily: 'var(--mantine-font-family-headings)',
        fontWeight: '600',
        sizes: {
            h1: {fontSize: 'var(--text-2xl)', lineHeight: '1.2'},
            h2: {fontSize: 'var(--text-xl)', lineHeight: '1.25'},
            h3: {fontSize: 'var(--text-lg)', lineHeight: '1.3'},
            h4: {fontSize: 'var(--text-md)', lineHeight: '1.35'},
            h5: {fontSize: 'var(--text-sm)', lineHeight: '1.4'},
            h6: {fontSize: 'var(--text-xs)', lineHeight: '1.4'},
        },
    },

    defaultRadius: 'md',
    cursorType: 'pointer',
    respectReducedMotion: true,

    colors: {
        brand: [
            '#eff6ff',
            '#dbeafe',
            '#bfdbfe',
            '#93c5fd',
            '#60a5fa',
            '#3b82f6',
            '#2563eb',
            '#1d4ed8',
            '#1e40af',
            '#1e3a8a',
        ],
    },

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

        Button: Button.extend({
            defaultProps: {
                size: 'md',
                radius: 'md',
            },
            styles: (_theme, props) => ({
                root: {
                    height: resolveButtonHeight(props.size as MantineSize | undefined),
                    fontWeight: 600,
                    paddingInline: 'var(--space-4)',
                    transition: 'transform 120ms ease, box-shadow 120ms ease, var(--transition-colors)',
                    '&:focus-visible': {
                        outline: 'none',
                        boxShadow: 'var(--shadow-focus-brand)',
                    },
                    '&:active': {
                        transform: 'scale(0.97)',
                    },
                },
            }),
        }),

        SegmentedControl: SegmentedControl.extend({
            defaultProps: {
                // radius: 'xl',
                // fullWidth: true,
            },
            styles: {
                root: {
                    backgroundColor: 'var(--surface-tertiary)',
                    padding: '3px',
                    borderRadius: 'var(--radius-full)',
                },
                control: {
                    border: 0,
                },
                label: {
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: 'var(--mantine-color-text-secondary)',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'var(--transition-colors), var(--transition-shadow)',
                    minHeight: 'var(--touch-target-min)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',

                    '&[data-active]': {
                        color: 'var(--mantine-color-text-primary)',
                        fontWeight: 600,
                    },
                },
                indicator: {
                    backgroundColor: 'var(--surface-primary)',
                    borderRadius: 'var(--radius-full)',
                    boxShadow: 'var(--shadow-sm)',
                },
            },
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

        Input: Input.extend({
            styles: {
                input: {
                    ...inputBaseStyles,
                },
                section: {
                    color: 'var(--mantine-color-text-secondary)',
                },
            },
        }),

        InputWrapper: InputWrapper.extend({
            styles: {
                label: {
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--mantine-color-text-primary)',
                    marginBottom: 'var(--space-0)',
                },
                description: {
                    fontSize: 'var(--text-xs)',
                    color: 'var(--mantine-color-text-secondary)',
                    marginTop: 'var(--space-0)',
                },
                error: {
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                },
            },
        }),

        TextInput: TextInput.extend({
            styles: {
                input: {
                    ...inputBaseStyles,
                },
            },
        }),

        PasswordInput: PasswordInput.extend({
            styles: {
                input: {
                    ...inputBaseStyles,
                    paddingRight: 'calc(var(--space-4) + 32px)',
                },
                visibilityToggle: {
                    color: 'var(--mantine-color-text-secondary)',
                },
            },
        }),

        NumberInput: NumberInput.extend({
            styles: {
                input: {
                    ...inputBaseStyles,
                    paddingRight: 'calc(var(--space-4) + 32px)',
                },
                control: {
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--mantine-color-text-secondary)',
                    transition: 'var(--transition-colors)',
                    '&:hover': {
                        backgroundColor: 'var(--surface-secondary)',
                    },
                },
            },
        }),

        Textarea: Textarea.extend({
            styles: {
                input: {
                    ...inputBaseStyles,
                    height: 'auto',
                    minHeight: 'calc(var(--input-height) * 2)',
                    paddingTop: 'var(--space-3)',
                    paddingBottom: 'var(--space-3)',
                    resize: 'vertical',
                },
            },
        }),

        Select: Select.extend({
            styles: {
                input: {
                    ...inputBaseStyles,
                },
                dropdown: {
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    borderColor: 'var(--border-subtle)',
                },
                option: {
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                    padding: 'var(--space-3) var(--space-4)',
                    '&[data-combobox-selected]': {
                        backgroundColor: 'var(--surface-tertiary)',
                        color: 'var(--mantine-color-text-primary)',
                    },
                    '&[data-combobox-active]': {
                        backgroundColor: 'var(--surface-secondary)',
                    },
                },
            },
        }),

        Autocomplete: Autocomplete.extend({
            styles: {
                input: {
                    ...inputBaseStyles,
                },
                dropdown: {
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    borderColor: 'var(--border-subtle)',
                },
                option: {
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                    padding: 'var(--space-3) var(--space-4)',
                    '&[data-combobox-selected]': {
                        backgroundColor: 'var(--surface-tertiary)',
                    },
                    '&[data-combobox-active]': {
                        backgroundColor: 'var(--surface-secondary)',
                    },
                },
            },
        }),

        MultiSelect: MultiSelect.extend({
            styles: {
                input: {
                    ...inputBaseStyles,
                    minHeight: 'var(--input-height)',
                    height: 'auto',
                    paddingTop: 'var(--space-2)',
                    paddingBottom: 'var(--space-2)',
                },
                pill: {
                    backgroundColor: 'var(--surface-tertiary)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                },
                dropdown: {
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    borderColor: 'var(--border-subtle)',
                },
                option: {
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                    padding: 'var(--space-3) var(--space-4)',
                    '&[data-combobox-selected]': {
                        backgroundColor: 'var(--surface-tertiary)',
                    },
                    '&[data-combobox-active]': {
                        backgroundColor: 'var(--surface-secondary)',
                    },
                },
            },
        }),

        Switch: Switch.extend({
            styles: {
                track: {
                    backgroundColor: 'var(--surface-tertiary)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'var(--transition-colors)',
                    '&[data-checked]': {
                        backgroundColor: 'var(--mantine-color-brand-6)',
                        borderColor: 'var(--mantine-color-brand-6)',
                    },
                },
                thumb: {
                    backgroundColor: 'var(--surface-primary)',
                    borderColor: 'var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                },
                label: {
                    fontSize: 'var(--text-base)',
                    color: 'var(--mantine-color-text-primary)',
                },
            },
        }),

        Tabs: Tabs.extend({
            styles: (_theme, props) => {
                const variant = props.variant ?? 'default';

                // Underline tabs (top navigation style): text + short centered active indicator
                if (variant === 'default') {
                    return {
                        list: {
                            gap: 'var(--space-6)',
                            borderBottom: '1px solid var(--border-subtle)',
                        },
                        tab: {
                            position: 'relative',
                            fontSize: 'var(--text-base)',
                            fontWeight: 600,
                            color: 'var(--mantine-color-text-secondary)',
                            padding: 'var(--space-3) var(--space-2)',
                            border: 0,
                            backgroundColor: 'transparent',
                            transition: 'var(--transition-colors)',

                            '&:hover': {
                                color: 'var(--mantine-color-text-primary)',
                            },

                            '&:focus-visible': {
                                outline: 'none',
                                boxShadow: 'var(--shadow-focus-brand)',
                                borderRadius: 'var(--radius-md)',
                            },

                            '&[data-active]': {
                                color: 'var(--mantine-color-text-primary)',
                            },

                            '&[data-active]::after': {
                                content: '""',
                                position: 'absolute',
                                left: '50%',
                                bottom: '-1px',
                                width: '24px',
                                height: '3px',
                                backgroundColor: 'var(--mantine-color-black)',
                                borderRadius: 'var(--radius-full)',
                                transform: 'translateX(-50%)',
                            },
                        },

                        // Hide Mantine's default moving indicator so we can match
                        // the short centered iOS-style indicator exactly.
                        indicator: {
                            display: 'none',
                        },
                    };
                }

                // Segmented/pills tabs (Recipes/Foods style): pill container + black active pill
                if (variant === 'pills') {
                    return {
                        list: {
                            gap: 0,
                            padding: 'var(--space-1)',
                            backgroundColor: 'var(--surface-tertiary)',
                            borderRadius: 'var(--radius-full)',
                            border: 0,
                        },
                        tab: {
                            flex: '1 1 0',
                            justifyContent: 'center',
                            minHeight: '36px',
                            padding: '0 var(--space-4)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--text-base)',
                            fontWeight: 600,
                            color: 'var(--mantine-color-text-primary)',
                            transition: 'var(--transition-colors), var(--transition-shadow)',

                            '&:hover': {
                                color: 'var(--mantine-color-text-primary)',
                            },

                            '&:focus-visible': {
                                outline: 'none',
                                boxShadow: 'var(--shadow-focus-brand)',
                            },

                            '&[data-active]': {
                                backgroundColor: 'var(--mantine-color-black)',
                                color: 'var(--mantine-color-text-inverse)',
                                boxShadow: 'none',
                            },
                        },
                    };
                }

                return {
                    tab: {
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                        color: 'var(--mantine-color-text-secondary)',
                        transition: 'var(--transition-colors)',
                        '&[data-active]': {
                            color: 'var(--mantine-color-text-primary)',
                        },
                    },
                };
            },
        }),

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
