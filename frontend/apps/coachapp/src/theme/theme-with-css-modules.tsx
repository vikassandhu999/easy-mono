import '@fontsource-variable/inter';
import '@fontsource-variable/roboto-mono';
import '@fontsource-variable/nunito';
import '@mantine/core/styles.css';

import './default-css-variables.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
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

export const theme = createTheme({
    colors: {
        brand: brandBlue,
        gray: neutralGray,
        green: systemGreen,
        red: systemRed,
    },
    components: {
        Badge: Badge.extend({defaultProps: {size: 'md'}, styles: {root: {fontWeight: 600}}}),
        Checkbox: Checkbox.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
            },
        }),
        ColorInput: ColorInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                wrapper: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
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
            styles: {
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
                wrapper: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
        }),
        InputDescription: InputDescription.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
            },
        }),
        InputError: InputError.extend({
            defaultProps: {size: 'md'},
            styles: {
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
            },
        }),
        InputLabel: InputLabel.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
            },
        }),
        InputWrapper: InputWrapper.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {fontWeight: 400, marginBottom: 'var(--ce-size-sm)'},
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                root: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
        }),
        Menu: Menu.extend({
            styles: {
                dropdown: {
                    borderRadius: 'var(--callout-offset)',
                    gap: 'var(--ce-size-3xs)',
                    padding: 'calc(var(--ce-size-xl) * var(--ce-halfstep-dec))',
                },
                item: {
                    borderRadius: 'var(--callout-offset)',
                    fontSize: 'var(--callout-font-size)',
                    minHeight: 'var(--ce-size-xl)',
                },
                itemLabel: {fontWeight: 400},
                itemSection: {fontSize: 'var(--callout-font-size)', paddingInlineEnd: 'var(--ce-size-sm)'},
                label: {
                    fontSize: 'var(--label-font-size)',
                    fontWeight: 500,
                    marginBottom: 'var(--ce-size-sm)',
                },
            },
        }),
        MultiSelect: MultiSelect.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                wrapper: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
        }),
        NumberInput: NumberInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                wrapper: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
        }),
        PasswordInput: PasswordInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                wrapper: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
        }),
        PillsInput: PillsInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                wrapper: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
        }),
        PinInput: PinInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
            },
        }),
        Radio: Radio.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                label: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
            },
        }),
        RadioGroup: RadioGroup.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
            },
        }),

        Select: Select.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                wrapper: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
        }),

        Textarea: Textarea.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                wrapper: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
        }),

        TextInput: TextInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-sm)',
                },
                error: {
                    fontWeight: 400,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                },
                label: {
                    fontWeight: 600,
                    marginBottom: 'var(--ce-size-2xs)',
                },
                wrapper: {height: 'unset', marginBottom: 'var(--ce-size-sm)'},
            },
        }),
    },
    primaryColor: 'brand',
    primaryShade: 5,
});
