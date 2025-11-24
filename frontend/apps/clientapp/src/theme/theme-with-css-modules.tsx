import '@fontsource-variable/inter';
import '@fontsource-variable/roboto-mono';
import '@fontsource-variable/nunito';
import '@mantine/core/styles.css';

import './default-css-variables.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import {
    Badge,
    Checkbox,
    ColorInput,
    createTheme,
    Drawer,
    Input,
    InputDescription,
    InputError,
    InputLabel,
    InputWrapper,
    MantineColorsTuple,
    Menu,
    MultiSelect,
    NumberInput,
    PasswordInput,
    PillsInput,
    PinInput,
    Radio,
    RadioGroup,
    ScrollArea,
    Select,
    Textarea,
    TextInput,
} from '@mantine/core';

const brandBlue: MantineColorsTuple = [
    '#f0f7ff',
    '#d1e9ff',
    '#a6d4ff',
    '#7fbfff',
    '#5aa9ff',
    '#3b94ff',
    '#2d7fff',
    '#1e6aff',
    '#0f56ff',
    '#0043e6',
];

const systemRed: MantineColorsTuple = [
    '#fff5f5',
    '#ffe3e3',
    '#ffc9c9',
    '#ffa8a8',
    '#ff8787',
    '#ff6b6b',
    '#fa5252',
    '#f03e3e',
    '#e03131',
    '#c92a2a',
];

const systemGreen: MantineColorsTuple = [
    '#f3faf7',
    '#d3f9e0',
    '#a9f3c1',
    '#7fe9a0',
    '#5dd87f',
    '#40c057',
    '#37b24d',
    '#2f9e44',
    '#2b8a3e',
    '#237032',
];

const neutralGray: MantineColorsTuple = [
    '#ffffff',
    '#f8f9fa',
    '#e9ecef',
    '#dee2e6',
    '#ced4da',
    '#adb5bd',
    '#6c757d',
    '#495057',
    '#343a40',
    '#1a1a1a',
];

const formDescriptionStyles = {
    order: 1,
    fontWeight: 400,
    fontSize: 'var(--mantine-font-size-sm)',
    lineHeight: 1.5,
    color: 'var(--mantine-color-gray-7)',
    marginBottom: 0,
} as const;

const formErrorStyles = {
    order: 3,
    fontWeight: 500,
    fontSize: 'var(--mantine-font-size-sm)',
    lineHeight: 1.5,
    color: 'var(--mantine-color-red-7)',
    marginTop: 0,
} as const;

const formLabelStyles = {
    order: 0,
    display: 'flex',
    alignItems: 'baseline',
    gap: 'var(--ce-size-2xs)',
    fontWeight: 600,
    fontSize: 'var(--label-font-size)',
    lineHeight: 1.2,
    color: 'var(--mantine-color-gray-8)',
    marginBottom: 0,
    '&[data-required]::after': {
        content: '"*"',
        marginLeft: 'calc(var(--ce-size-xs) / 2)',
        color: 'var(--mantine-color-gray-7)',
        fontWeight: 500,
    },
} as const;

const formFieldWrapperStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 'var(--ce-size-2xs)',
    marginBottom: 0,
    width: '100%',
} as const;

const baseInteractiveFieldStyles = {
    order: 2,
    borderRadius: 'var(--ce-size-sm)',
    border: '1.5px solid var(--mantine-color-gray-4)',
    backgroundColor: 'var(--mantine-color-white)',
    fontSize: 'var(--body-font-size)',
    fontWeight: 400,
    lineHeight: 1.5,
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    '&:focus, &:focus-visible': {
        outline: 'none',
        borderColor: 'var(--mantine-color-brand-6)',
        borderWidth: '2px',
        boxShadow: '0 0 0 2px rgba(31, 106, 255, 0.12)',
    },
    '&[data-invalid]': {
        borderColor: 'var(--mantine-color-red-6)',
        boxShadow: '0 0 0 2px rgba(250, 82, 82, 0.12)',
    },
    '&::placeholder': {
        color: 'var(--mantine-color-gray-6)',
        opacity: 1,
    },
    '&:disabled': {
        backgroundColor: 'var(--mantine-color-gray-1)',
        borderColor: 'var(--mantine-color-gray-3)',
        color: 'var(--mantine-color-gray-6)',
        cursor: 'not-allowed',
    },
} as const;

export const theme = createTheme({
    colors: {
        brand: brandBlue,
        gray: neutralGray,
        green: systemGreen,
        red: systemRed,
    },
    components: {
        Badge: Badge.extend({
            defaultProps: {size: 'md'},
            styles: {root: {fontWeight: 600, textTransform: 'capitalize'}},
        }),
        Checkbox: Checkbox.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                body: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 'var(--ce-size-2xs)',
                },
                description: {
                    ...formDescriptionStyles,
                    marginBottom: 0,
                },
                error: {...formErrorStyles},
                input: {
                    width: '20px',
                    height: '20px',
                    borderRadius: 'var(--ce-size-2xs)',
                    border: '1.5px solid var(--mantine-color-gray-5)',
                    transition: 'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
                    '&:checked': {
                        backgroundColor: 'var(--mantine-color-brand-6)',
                        borderColor: 'var(--mantine-color-brand-6)',
                    },
                    '&:focus-visible': {
                        outline: 'none',
                        boxShadow: '0 0 0 2px rgba(31, 106, 255, 0.2)',
                    },
                    '&:disabled': {
                        backgroundColor: 'var(--mantine-color-gray-1)',
                        borderColor: 'var(--mantine-color-gray-3)',
                    },
                },
                label: {
                    color: 'var(--mantine-color-gray-8)',
                    fontWeight: 500,
                    lineHeight: 1.5,
                    marginBottom: 0,
                },
            }),
        }),
        ColorInput: ColorInput.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                input: {
                    ...baseInteractiveFieldStyles,
                    paddingLeft: 'calc(var(--ce-size-md) + 2.5rem)',
                },
                label: {...formLabelStyles},
                wrapper: {...formFieldWrapperStyles},
            }),
        }),
        Drawer: Drawer.extend({
            defaultProps: {
                position: 'right',
                scrollAreaComponent: ScrollArea.Autosize,
                size: '100%',
                transitionProps: {duration: 150, timingFunction: 'linear', transition: 'fade-left'},
            },
            styles: {body: {overflow: 'hidden', padding: 0}},
        }),
        Input: Input.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                input: {...baseInteractiveFieldStyles},
                wrapper: {...formFieldWrapperStyles},
            }),
        }),
        InputDescription: InputDescription.extend({
            defaultProps: {size: 'md'},
            styles: () => ({description: {...formDescriptionStyles}}),
        }),
        InputError: InputError.extend({
            defaultProps: {size: 'md'},
            styles: () => ({error: {...formErrorStyles}}),
        }),
        InputLabel: InputLabel.extend({
            defaultProps: {size: 'md'},
            styles: () => ({label: {...formLabelStyles}}),
        }),
        InputWrapper: InputWrapper.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                label: {...formLabelStyles},
                root: {...formFieldWrapperStyles},
            }),
        }),
        Menu: Menu.extend({
            styles: {
                divider: {
                    margin: 0,
                    marginBlock: 'var(--ce-size-xs)',
                },
                dropdown: {
                    borderRadius: 'var(--mantine-radius-md)',
                    border: '1px solid var(--mantine-color-gray-3)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    padding: 'var(--ce-size-xs)',
                },
                item: {
                    borderRadius: 'var(--mantine-radius-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    padding: 'var(--ce-size-sm)',
                    '&[data-hovered]': {
                        backgroundColor: 'var(--mantine-color-gray-0)',
                    },
                    '&[data-hovered][data-menu-item][data-color="red"]': {
                        backgroundColor: 'var(--mantine-color-red-0)',
                    },
                },
                itemLabel: {
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                },
                itemSection: {
                    marginRight: 'var(--ce-size-xs)',
                },
                label: {
                    fontSize: 'var(--label-font-size)',
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-xs)',
                    color: 'var(--mantine-color-gray-6)',
                },
            },
        }),
        MultiSelect: MultiSelect.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                input: {
                    ...baseInteractiveFieldStyles,
                },
                label: {...formLabelStyles},
                values: {
                    gap: 'var(--ce-size-2xs)',
                },
                wrapper: {...formFieldWrapperStyles},
            }),
        }),
        NumberInput: NumberInput.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                input: {
                    ...baseInteractiveFieldStyles,
                    paddingRight: '3.5rem',
                },
                label: {...formLabelStyles},
                control: {
                    width: '44px',
                    borderLeft: '1px solid var(--mantine-color-gray-3)',
                    '&:hover': {
                        backgroundColor: 'var(--mantine-color-gray-1)',
                    },
                    '&:focus-visible': {
                        outline: 'none',
                        boxShadow: '0 0 0 2px rgba(31, 106, 255, 0.2)',
                    },
                },
                controls: {
                    height: '100%',
                },
                wrapper: {...formFieldWrapperStyles},
            }),
        }),
        PasswordInput: PasswordInput.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                input: {...baseInteractiveFieldStyles},
                innerInput: {
                    ...baseInteractiveFieldStyles,
                },
                label: {...formLabelStyles},
                visibilityToggle: {
                    color: 'var(--mantine-color-gray-7)',
                    '&:focus-visible': {
                        outline: 'none',
                        boxShadow: '0 0 0 2px rgba(31, 106, 255, 0.2)',
                    },
                },
                wrapper: {...formFieldWrapperStyles},
            }),
        }),
        PillsInput: PillsInput.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                input: {
                    ...baseInteractiveFieldStyles,
                    minHeight: '54px',
                },
                label: {...formLabelStyles},
                pillsList: {
                    gap: 'var(--ce-size-2xs)',
                },
                wrapper: {...formFieldWrapperStyles},
            }),
        }),
        PinInput: PinInput.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                input: {
                    ...baseInteractiveFieldStyles,
                    textAlign: 'center',
                    width: '3rem',
                    height: '3rem',
                    padding: 0,
                },
                root: {
                    display: 'flex',
                    gap: 'var(--ce-size-sm)',
                    width: '100%',
                    justifyContent: 'flex-start',
                },
            }),
        }),
        Radio: Radio.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {
                    ...formDescriptionStyles,
                    marginBottom: 0,
                },
                error: {...formErrorStyles},
                inner: {
                    alignItems: 'flex-start',
                    gap: 'var(--ce-size-2xs)',
                },
                label: {
                    color: 'var(--mantine-color-gray-8)',
                    fontWeight: 500,
                    lineHeight: 1.5,
                    marginBottom: 0,
                },
            }),
        }),
        RadioGroup: RadioGroup.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                label: {...formLabelStyles},
                root: {
                    ...formFieldWrapperStyles,
                    gap: 'var(--ce-size-sm)',
                },
            }),
        }),

        Select: Select.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                input: {
                    ...baseInteractiveFieldStyles,
                    cursor: 'pointer',
                    paddingRight: 'calc(var(--ce-size-md) + 2.5rem)',
                },
                label: {...formLabelStyles},
                dropdown: {
                    borderRadius: 'var(--mantine-radius-md)',
                    border: '1px solid var(--mantine-color-gray-3)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                },
                wrapper: {...formFieldWrapperStyles},
            }),
        }),

        Textarea: Textarea.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                input: {
                    ...baseInteractiveFieldStyles,
                    resize: 'vertical',
                    padding: 'var(--ce-size-md)',
                },
                label: {...formLabelStyles},
                wrapper: {...formFieldWrapperStyles},
            }),
        }),

        TextInput: TextInput.extend({
            defaultProps: {size: 'md'},
            styles: () => ({
                description: {...formDescriptionStyles},
                error: {...formErrorStyles},
                input: {
                    ...baseInteractiveFieldStyles,
                    '&[data-with-icon]': {
                        paddingLeft: 'calc(var(--ce-size-md) + 2.5rem)',
                    },
                },
                label: {...formLabelStyles},
                wrapper: {...formFieldWrapperStyles},
            }),
        }),
    },
    primaryColor: 'brand',
    primaryShade: 5,
});
