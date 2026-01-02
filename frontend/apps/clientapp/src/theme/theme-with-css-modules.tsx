import '@fontsource-variable/inter';
import '@fontsource-variable/roboto-mono';
import '@fontsource-variable/nunito';
import {
    ActionIcon,
    Anchor,
    AppShell,
    Avatar,
    Badge,
    Breadcrumbs,
    Button,
    Card,
    Checkbox,
    Chip,
    ColorInput,
    createTheme,
    Divider,
    Drawer,
    Input,
    InputDescription,
    InputError,
    InputLabel,
    InputWrapper,
    Loader,
    MantineColorsTuple,
    Menu,
    Modal,
    MultiSelect,
    NavLink,
    Notification,
    NumberInput,
    Pagination,
    Paper,
    PasswordInput,
    Pill,
    PillsInput,
    PinInput,
    Progress,
    Radio,
    RadioGroup,
    rem,
    ScrollArea,
    SegmentedControl,
    Select,
    Skeleton,
    Slider,
    Stepper,
    Switch,
    Table,
    Tabs,
    TagsInput,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import './default-css-variables.css';

/* ============================================
   COLOR PALETTE

   Designed for a coaching/fitness app:
   - Brand Blue: Trust, professionalism, calm motivation
   - Green: Success, health, achievement
   - Red: Alerts, errors, intensity
   - Orange: Energy, warnings, warmth
   - Gray: Neutral UI, hierarchy
   ============================================ */

// Primary brand color - Professional blue that conveys trust and expertise
const brandBlue: MantineColorsTuple = [
    '#eff6ff', // 0 - Lightest background
    '#dbeafe', // 1 - Light hover
    '#bfdbfe', // 2 - Subtle highlight
    '#93c5fd', // 3 - Light accent
    '#60a5fa', // 4 - Medium accent
    '#3b82f6', // 5 - Primary (main brand)
    '#2563eb', // 6 - Primary hover
    '#1d4ed8', // 7 - Primary pressed
    '#1e40af', // 8 - Dark variant
    '#1e3a8a', // 9 - Darkest
];

// Success/Health green - Achievement and positive outcomes
const successGreen: MantineColorsTuple = [
    '#f0fdf4', // 0
    '#dcfce7', // 1
    '#bbf7d0', // 2
    '#86efac', // 3
    '#4ade80', // 4
    '#22c55e', // 5 - Primary success
    '#16a34a', // 6
    '#15803d', // 7
    '#166534', // 8
    '#14532d', // 9
];

// Error/Alert red - Clear error states and warnings
const errorRed: MantineColorsTuple = [
    '#fef2f2', // 0
    '#fee2e2', // 1
    '#fecaca', // 2
    '#fca5a5', // 3
    '#f87171', // 4
    '#ef4444', // 5 - Primary error
    '#dc2626', // 6
    '#b91c1c', // 7
    '#991b1b', // 8
    '#7f1d1d', // 9
];

// Energy orange - Warnings and high-energy states
const energyOrange: MantineColorsTuple = [
    '#fff7ed', // 0
    '#ffedd5', // 1
    '#fed7aa', // 2
    '#fdba74', // 3
    '#fb923c', // 4
    '#f97316', // 5 - Primary warning
    '#ea580c', // 6
    '#c2410c', // 7
    '#9a3412', // 8
    '#7c2d12', // 9
];

// Neutral gray - UI hierarchy and text
const neutralGray: MantineColorsTuple = [
    '#ffffff', // 0 - Pure white
    '#f8fafc', // 1 - Background
    '#f1f5f9', // 2 - Subtle background
    '#e2e8f0', // 3 - Border light
    '#cbd5e1', // 4 - Border
    '#94a3b8', // 5 - Muted text
    '#64748b', // 6 - Secondary text
    '#475569', // 7 - Body text
    '#334155', // 8 - Strong text
    '#1e293b', // 9 - Heading text
];

/* ============================================
   SHARED STYLE DEFINITIONS
   ============================================ */

// Form label styling - Consistent across all inputs
const formLabelStyles = {
    fontWeight: 500,
    fontSize: 'var(--text-sm)',
    lineHeight: 'var(--leading-normal)',
    color: 'var(--mantine-color-gray-8)',
    marginBottom: 'var(--ce-space-1)',
} as const;

// Form description styling
const formDescriptionStyles = {
    fontWeight: 400,
    fontSize: 'var(--text-xs)',
    lineHeight: 'var(--leading-relaxed)',
    color: 'var(--mantine-color-gray-6)',
    marginTop: 'var(--ce-space-1)',
} as const;

// Form error styling
const formErrorStyles = {
    fontWeight: 500,
    fontSize: 'var(--text-xs)',
    lineHeight: 'var(--leading-normal)',
    color: 'var(--mantine-color-red-6)',
    marginTop: 'var(--ce-space-1)',
} as const;

// Base input field styling - Mobile-first touch-friendly
const baseInputStyles = {
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    backgroundColor: 'var(--surface-primary)',
    fontSize: 'var(--text-base)',
    fontWeight: 400,
    lineHeight: 'var(--leading-normal)',
    height: 'var(--input-height)',
    minHeight: 'var(--input-height)',
    paddingInline: 'var(--ce-space-3)',
    transition:
        'border-color var(--duration-fast) var(--ease-in-out), box-shadow var(--duration-fast) var(--ease-in-out)',
    '&:hover:not(:disabled):not(:focus)': {
        borderColor: 'var(--border-strong)',
    },
    '&:focus, &:focus-within': {
        outline: 'none',
        borderColor: 'var(--mantine-color-brand-5)',
        boxShadow: 'var(--shadow-focus-brand)',
    },
    '&[data-invalid]': {
        borderColor: 'var(--mantine-color-red-5)',
        '&:focus': {
            boxShadow: 'var(--shadow-focus-error)',
        },
    },
    '&::placeholder': {
        color: 'var(--mantine-color-gray-5)',
        opacity: 1,
    },
    '&:disabled': {
        backgroundColor: 'var(--surface-secondary)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--mantine-color-gray-5)',
        cursor: 'not-allowed',
        opacity: 0.7,
    },
} as const;

// Form field wrapper
const formWrapperStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    width: '100%',
} as const;

/* ============================================
   THEME EXPORT
   ============================================ */

export const theme = createTheme({
    /* Color configuration */
    colors: {
        brand: brandBlue,
        gray: neutralGray,
        green: successGreen,
        red: errorRed,
        orange: energyOrange,
    },
    primaryColor: 'brand',
    primaryShade: 5,

    /* Default radius for all components */
    defaultRadius: 'md',

    /* Respect user's reduced motion preferences */
    respectReducedMotion: true,

    /* Cursor style */
    cursorType: 'pointer',

    /* Component customizations */
    components: {
        /* ========== BUTTONS & ACTIONS ========== */

        ActionIcon: ActionIcon.extend({
            defaultProps: {
                variant: 'subtle',
            },
            styles: {
                root: {
                    transition: 'all var(--duration-fast) var(--ease-in-out)',
                },
            },
        }),

        Button: Button.extend({
            defaultProps: {
                size: 'md',
                radius: 'md',
            },
            styles: (_theme, props) => {
                const heights: Record<string, string> = {
                    xs: 'var(--button-height-xs)',
                    sm: 'var(--button-height-sm)',
                    md: 'var(--button-height-md)',
                    lg: 'var(--button-height-lg)',
                    xl: 'var(--button-height-xl)',
                };
                return {
                    root: {
                        height: heights[props.size as string] || heights.md,
                        fontWeight: 600,
                        fontSize: 'var(--text-base)',
                        transition: 'all var(--duration-fast) var(--ease-in-out)',
                        '&:active:not(:disabled)': {
                            transform: 'scale(0.98)',
                        },
                    },
                    label: {
                        fontWeight: 600,
                    },
                };
            },
        }),

        /* ========== LAYOUT & CONTAINERS ========== */

        AppShell: AppShell.extend({
            styles: {
                main: {
                    backgroundColor: 'var(--surface-secondary)',
                    minHeight: '100dvh',
                },
                header: {
                    backgroundColor: 'var(--surface-primary)',
                    borderBottom: '1px solid var(--border-subtle)',
                },
                navbar: {
                    backgroundColor: 'var(--surface-primary)',
                    borderRight: '1px solid var(--border-subtle)',
                },
                footer: {
                    backgroundColor: 'var(--surface-primary)',
                    borderTop: '1px solid var(--border-subtle)',
                },
            },
        }),

        Card: Card.extend({
            defaultProps: {
                padding: 'md',
                radius: 'lg',
                withBorder: false,
            },
            styles: {
                root: {
                    backgroundColor: 'var(--surface-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'box-shadow var(--duration-normal) var(--ease-in-out)',
                    '&[data-with-border]': {
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'none',
                    },
                },
            },
        }),

        Divider: Divider.extend({
            styles: {
                root: {
                    borderColor: 'var(--border-subtle)',
                },
            },
        }),

        Drawer: Drawer.extend({
            defaultProps: {
                position: 'right',
                size: '100%',
                scrollAreaComponent: ScrollArea.Autosize,
                transitionProps: {
                    duration: 200,
                    timingFunction: 'ease-out',
                    transition: 'slide-left',
                },
            },
            styles: {
                header: {
                    padding: 'var(--ce-space-4)',
                    borderBottom: '1px solid var(--border-subtle)',
                },
                title: {
                    fontWeight: 600,
                    fontSize: 'var(--text-lg)',
                },
                body: {
                    padding: 'var(--ce-space-4)',
                },
                close: {
                    width: 'var(--touch-target-min)',
                    height: 'var(--touch-target-min)',
                },
            },
        }),

        Modal: Modal.extend({
            defaultProps: {
                radius: 'lg',
                centered: true,
                overlayProps: {
                    backgroundOpacity: 0.4,
                    blur: 4,
                },
                transitionProps: {
                    duration: 200,
                    transition: 'pop',
                },
            },
            styles: {
                header: {
                    padding: 'var(--ce-space-4)',
                    paddingBottom: 'var(--ce-space-3)',
                },
                title: {
                    fontWeight: 600,
                    fontSize: 'var(--text-lg)',
                    color: 'var(--mantine-color-gray-9)',
                },
                body: {
                    padding: 'var(--ce-space-4)',
                    paddingTop: 0,
                },
                close: {
                    width: 'var(--touch-target-min)',
                    height: 'var(--touch-target-min)',
                },
            },
        }),

        Paper: Paper.extend({
            defaultProps: {
                radius: 'md',
            },
            styles: {
                root: {
                    backgroundColor: 'var(--surface-primary)',
                },
            },
        }),

        /* ========== FORM INPUTS ========== */

        Checkbox: Checkbox.extend({
            defaultProps: {
                size: 'md',
                radius: 'sm',
            },
            styles: {
                root: {
                    cursor: 'pointer',
                },
                input: {
                    width: rem(20),
                    height: rem(20),
                    cursor: 'pointer',
                    border: '1.5px solid var(--border-default)',
                    transition: 'all var(--duration-fast) var(--ease-in-out)',
                    '&:checked': {
                        backgroundColor: 'var(--mantine-color-brand-5)',
                        borderColor: 'var(--mantine-color-brand-5)',
                    },
                    '&:focus-visible': {
                        boxShadow: 'var(--shadow-focus-brand)',
                    },
                },
                label: {
                    paddingLeft: 'var(--ce-space-2)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 400,
                    cursor: 'pointer',
                },
                description: formDescriptionStyles,
                error: formErrorStyles,
            },
        }),

        ColorInput: ColorInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
                input: baseInputStyles,
                wrapper: formWrapperStyles,
            },
        }),

        Input: Input.extend({
            defaultProps: {size: 'md'},
            styles: {
                input: baseInputStyles,
                wrapper: formWrapperStyles,
            },
        }),

        InputDescription: InputDescription.extend({
            styles: {description: formDescriptionStyles},
        }),

        InputError: InputError.extend({
            styles: {error: formErrorStyles},
        }),

        InputLabel: InputLabel.extend({
            styles: {label: formLabelStyles},
        }),

        InputWrapper: InputWrapper.extend({
            styles: {
                root: formWrapperStyles,
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
            },
        }),

        MultiSelect: MultiSelect.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
                input: {
                    ...baseInputStyles,
                    height: 'auto',
                    minHeight: 'var(--input-height)',
                    paddingBlock: 'var(--ce-space-2)',
                },
                wrapper: formWrapperStyles,
                pill: {
                    backgroundColor: 'var(--mantine-color-brand-1)',
                    color: 'var(--mantine-color-brand-7)',
                },
            },
        }),

        NumberInput: NumberInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
                input: baseInputStyles,
                wrapper: formWrapperStyles,
                control: {
                    borderColor: 'var(--border-subtle)',
                    '&:hover': {
                        backgroundColor: 'var(--surface-secondary)',
                    },
                },
            },
        }),

        PasswordInput: PasswordInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
                input: baseInputStyles,
                innerInput: {
                    height: '100%',
                    fontSize: 'var(--text-base)',
                },
                wrapper: formWrapperStyles,
                visibilityToggle: {
                    width: 'var(--touch-target-min)',
                    height: '100%',
                    color: 'var(--mantine-color-gray-6)',
                    '&:hover': {
                        backgroundColor: 'transparent',
                        color: 'var(--mantine-color-gray-8)',
                    },
                },
            },
        }),

        PillsInput: PillsInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
                input: {
                    ...baseInputStyles,
                    height: 'auto',
                    minHeight: 'var(--input-height)',
                },
                wrapper: formWrapperStyles,
            },
        }),

        PinInput: PinInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                input: {
                    ...baseInputStyles,
                    width: rem(48),
                    height: rem(48),
                    textAlign: 'center',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 600,
                    padding: 0,
                },
                root: {
                    gap: 'var(--ce-space-2)',
                },
            },
        }),

        Radio: Radio.extend({
            defaultProps: {size: 'md'},
            styles: {
                root: {
                    cursor: 'pointer',
                },
                radio: {
                    width: rem(20),
                    height: rem(20),
                    cursor: 'pointer',
                    border: '1.5px solid var(--border-default)',
                    transition: 'all var(--duration-fast) var(--ease-in-out)',
                    '&:checked': {
                        backgroundColor: 'var(--mantine-color-brand-5)',
                        borderColor: 'var(--mantine-color-brand-5)',
                    },
                },
                label: {
                    paddingLeft: 'var(--ce-space-2)',
                    fontSize: 'var(--text-base)',
                    cursor: 'pointer',
                },
                description: formDescriptionStyles,
                error: formErrorStyles,
            },
        }),

        RadioGroup: RadioGroup.extend({
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
            },
        }),

        Select: Select.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
                input: {
                    ...baseInputStyles,
                    cursor: 'pointer',
                },
                wrapper: formWrapperStyles,
                dropdown: {
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--ce-space-1)',
                },
                option: {
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--ce-space-2) var(--ce-space-3)',
                    fontSize: 'var(--text-base)',
                    '&[data-selected]': {
                        backgroundColor: 'var(--mantine-color-brand-5)',
                    },
                    '&[data-hovered]:not([data-selected])': {
                        backgroundColor: 'var(--surface-secondary)',
                    },
                },
            },
        }),

        Slider: Slider.extend({
            styles: {
                root: {
                    paddingBlock: 'var(--ce-space-2)',
                },
                track: {
                    height: rem(6),
                },
                thumb: {
                    width: rem(20),
                    height: rem(20),
                    border: '2px solid var(--mantine-color-brand-5)',
                    boxShadow: 'var(--shadow-sm)',
                },
                bar: {
                    backgroundColor: 'var(--mantine-color-brand-5)',
                },
                markLabel: {
                    fontSize: 'var(--text-xs)',
                    color: 'var(--mantine-color-gray-6)',
                },
            },
        }),

        Switch: Switch.extend({
            defaultProps: {size: 'md'},
            styles: {
                root: {
                    cursor: 'pointer',
                },
                track: {
                    minWidth: rem(44),
                    height: rem(24),
                    cursor: 'pointer',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--surface-tertiary)',
                    '&[data-checked]': {
                        backgroundColor: 'var(--mantine-color-brand-5)',
                        borderColor: 'var(--mantine-color-brand-5)',
                    },
                },
                thumb: {
                    width: rem(20),
                    height: rem(20),
                    border: 'none',
                    boxShadow: 'var(--shadow-sm)',
                },
                label: {
                    paddingLeft: 'var(--ce-space-2)',
                    fontSize: 'var(--text-base)',
                    cursor: 'pointer',
                },
            },
        }),

        TagsInput: TagsInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
                input: {
                    ...baseInputStyles,
                    height: 'auto',
                    minHeight: 'var(--input-height)',
                },
                wrapper: formWrapperStyles,
            },
        }),

        Textarea: Textarea.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
                input: {
                    ...baseInputStyles,
                    height: 'auto',
                    minHeight: rem(100),
                    paddingBlock: 'var(--ce-space-3)',
                    resize: 'vertical',
                },
                wrapper: formWrapperStyles,
            },
        }),

        TextInput: TextInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: formLabelStyles,
                description: formDescriptionStyles,
                error: formErrorStyles,
                input: baseInputStyles,
                wrapper: formWrapperStyles,
            },
        }),

        /* ========== NAVIGATION ========== */

        Anchor: Anchor.extend({
            styles: {
                root: {
                    color: 'var(--mantine-color-brand-6)',
                    fontWeight: 500,
                    textDecoration: 'none',
                    '&:hover': {
                        textDecoration: 'underline',
                    },
                },
            },
        }),

        Breadcrumbs: Breadcrumbs.extend({
            styles: {
                root: {
                    fontSize: 'var(--text-sm)',
                },
                separator: {
                    color: 'var(--mantine-color-gray-5)',
                    margin: '0 var(--ce-space-2)',
                },
            },
        }),

        Menu: Menu.extend({
            defaultProps: {
                radius: 'lg',
                shadow: 'lg',
            },
            styles: {
                dropdown: {
                    border: '1px solid var(--border-subtle)',
                    padding: 'var(--ce-space-1)',
                },
                item: {
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--ce-space-2) var(--ce-space-3)',
                    fontSize: 'var(--text-base)',
                    minHeight: 'var(--touch-target-min)',
                    '&[data-hovered]': {
                        backgroundColor: 'var(--surface-secondary)',
                    },
                },
                itemLabel: {
                    fontWeight: 400,
                },
                itemSection: {
                    marginRight: 'var(--ce-space-2)',
                },
                label: {
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--mantine-color-gray-5)',
                    padding: 'var(--ce-space-2) var(--ce-space-3)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--tracking-wider)',
                },
                divider: {
                    marginBlock: 'var(--ce-space-1)',
                    borderColor: 'var(--border-subtle)',
                },
            },
        }),

        NavLink: NavLink.extend({
            styles: {
                root: {
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--ce-space-2) var(--ce-space-3)',
                    minHeight: 'var(--touch-target-min)',
                    transition: 'background-color var(--duration-fast) var(--ease-in-out)',
                    '&:hover': {
                        backgroundColor: 'var(--surface-secondary)',
                    },
                    '&[data-active]': {
                        backgroundColor: 'var(--mantine-color-brand-0)',
                        color: 'var(--mantine-color-brand-7)',
                        '&:hover': {
                            backgroundColor: 'var(--mantine-color-brand-1)',
                        },
                    },
                },
                label: {
                    fontWeight: 500,
                },
            },
        }),

        Pagination: Pagination.extend({
            styles: {
                control: {
                    minWidth: 'var(--touch-target-min)',
                    height: 'var(--touch-target-min)',
                    fontSize: 'var(--text-sm)',
                    borderRadius: 'var(--radius-md)',
                    '&[data-active]': {
                        backgroundColor: 'var(--mantine-color-brand-5)',
                    },
                },
            },
        }),

        Tabs: Tabs.extend({
            styles: {
                root: {},
                list: {
                    gap: 0,
                    borderBottom: '1px solid var(--border-subtle)',
                },
                tab: {
                    fontWeight: 500,
                    fontSize: 'var(--text-base)',
                    padding: 'var(--ce-space-3) var(--ce-space-4)',
                    minHeight: 'var(--touch-target-min)',
                    borderRadius: 0,
                    borderBottom: '2px solid transparent',
                    marginBottom: '-1px',
                    color: 'var(--mantine-color-gray-6)',
                    transition: 'all var(--duration-fast) var(--ease-in-out)',
                    '&:hover': {
                        backgroundColor: 'var(--surface-secondary)',
                        color: 'var(--mantine-color-gray-8)',
                    },
                    '&[data-active]': {
                        borderColor: 'var(--mantine-color-brand-5)',
                        color: 'var(--mantine-color-brand-6)',
                        backgroundColor: 'transparent',
                    },
                },
                panel: {
                    paddingTop: 'var(--ce-space-4)',
                },
            },
        }),

        /* ========== DATA DISPLAY ========== */

        Avatar: Avatar.extend({
            defaultProps: {
                radius: 'xl',
            },
            styles: {
                root: {
                    border: '2px solid var(--surface-primary)',
                },
                placeholder: {
                    backgroundColor: 'var(--mantine-color-brand-1)',
                    color: 'var(--mantine-color-brand-6)',
                    fontWeight: 600,
                },
            },
        }),

        Badge: Badge.extend({
            defaultProps: {
                size: 'md',
                radius: 'xl',
                variant: 'light',
            },
            styles: {
                root: {
                    fontWeight: 600,
                    textTransform: 'none',
                    letterSpacing: 'var(--tracking-normal)',
                },
            },
        }),

        Chip: Chip.extend({
            styles: {
                label: {
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    padding: 'var(--ce-space-1) var(--ce-space-3)',
                    minHeight: rem(32),
                },
            },
        }),

        Pill: Pill.extend({
            styles: {
                root: {
                    fontWeight: 500,
                    fontSize: 'var(--text-xs)',
                },
            },
        }),

        Progress: Progress.extend({
            styles: {
                root: {
                    backgroundColor: 'var(--surface-tertiary)',
                },
                section: {
                    transition: 'width var(--duration-slow) var(--ease-out)',
                },
            },
        }),

        SegmentedControl: SegmentedControl.extend({
            styles: {
                root: {
                    backgroundColor: 'var(--surface-tertiary)',
                    padding: 'var(--ce-space-0-5)',
                    borderRadius: 'var(--radius-lg)',
                },
                control: {
                    minHeight: rem(36),
                },
                label: {
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    padding: 'var(--ce-space-2) var(--ce-space-3)',
                },
                indicator: {
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-sm)',
                },
            },
        }),

        Skeleton: Skeleton.extend({
            styles: {
                root: {
                    '&::after': {
                        background: 'linear-gradient(90deg, transparent, var(--surface-secondary), transparent)',
                    },
                },
            },
        }),

        Stepper: Stepper.extend({
            styles: {
                step: {
                    minWidth: 'var(--touch-target-min)',
                },
                stepIcon: {
                    width: rem(32),
                    height: rem(32),
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                },
                stepLabel: {
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                },
                stepDescription: {
                    fontSize: 'var(--text-xs)',
                    color: 'var(--mantine-color-gray-6)',
                },
            },
        }),

        Table: Table.extend({
            styles: {
                table: {
                    fontSize: 'var(--text-sm)',
                },
                th: {
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--tracking-wide)',
                    color: 'var(--mantine-color-gray-6)',
                    padding: 'var(--ce-space-3)',
                    borderBottom: '1px solid var(--border-default)',
                },
                td: {
                    padding: 'var(--ce-space-3)',
                    borderBottom: '1px solid var(--border-subtle)',
                },
                tr: {
                    transition: 'background-color var(--duration-fast) var(--ease-in-out)',
                    '&:hover': {
                        backgroundColor: 'var(--surface-secondary)',
                    },
                },
            },
        }),

        ThemeIcon: ThemeIcon.extend({
            defaultProps: {
                variant: 'light',
                radius: 'md',
            },
        }),

        /* ========== TYPOGRAPHY ========== */

        Text: Text.extend({
            styles: {
                root: {
                    color: 'var(--mantine-color-text-primary)',
                },
            },
        }),

        Title: Title.extend({
            styles: {
                root: {
                    color: 'var(--mantine-color-gray-9)',
                    letterSpacing: 'var(--tracking-tight)',
                },
            },
        }),

        /* ========== FEEDBACK & OVERLAYS ========== */

        Loader: Loader.extend({
            defaultProps: {
                type: 'dots',
            },
        }),

        Notification: Notification.extend({
            defaultProps: {
                radius: 'lg',
            },
            styles: {
                root: {
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--ce-space-3)',
                    border: '1px solid var(--border-subtle)',
                },
                title: {
                    fontWeight: 600,
                    fontSize: 'var(--text-base)',
                },
                description: {
                    fontSize: 'var(--text-sm)',
                    color: 'var(--mantine-color-gray-7)',
                },
            },
        }),

        Tooltip: Tooltip.extend({
            defaultProps: {
                radius: 'md',
                withArrow: true,
                arrowSize: 8,
            },
            styles: {
                tooltip: {
                    fontSize: 'var(--text-xs)',
                    fontWeight: 500,
                    padding: 'var(--ce-space-1-5) var(--ce-space-2)',
                    backgroundColor: 'var(--mantine-color-gray-9)',
                },
            },
        }),
    },
});
