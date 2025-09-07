import '@fontsource-variable/inter';
import '@fontsource-variable/roboto-mono';
import '@fontsource-variable/nunito';

import '@mantine/core/styles/baseline.css';
import '@mantine/core/styles/default-css-variables.css';
import './default-css-variables.css';
import '@mantine/core/styles/global.css';
import '@mantine/core/styles/ScrollArea.css';
import '@mantine/core/styles/UnstyledButton.css';
import '@mantine/core/styles/VisuallyHidden.css';
import '@mantine/core/styles/Paper.css';
import '@mantine/core/styles/Popover.css';
import '@mantine/core/styles/CloseButton.css';
import '@mantine/core/styles/Group.css';
import '@mantine/core/styles/Loader.css';
import '@mantine/core/styles/Overlay.css';
import '@mantine/core/styles/ModalBase.css';
import '@mantine/core/styles/Input.css';
import '@mantine/core/styles/InlineInput.css';
import '@mantine/core/styles/Flex.css';
import '@mantine/core/styles/FloatingIndicator.css';
import '@mantine/core/styles/ActionIcon.css';
import '@mantine/core/styles/Accordion.css';
import '@mantine/core/styles/Affix.css';
import '@mantine/core/styles/Alert.css';
import '@mantine/core/styles/Anchor.css';
import '@mantine/core/styles/AngleSlider.css';
import '@mantine/core/styles/AppShell.css';
import '@mantine/core/styles/AspectRatio.css';
import '@mantine/core/styles/Avatar.css';
import '@mantine/core/styles/BackgroundImage.css';
import '@mantine/core/styles/Badge.css';
import '@mantine/core/styles/Blockquote.css';
import '@mantine/core/styles/Breadcrumbs.css';
import '@mantine/core/styles/Burger.css';
import '@mantine/core/styles/Button.css';
import '@mantine/core/styles/Card.css';
import '@mantine/core/styles/Center.css';
import '@mantine/core/styles/Checkbox.css';
import '@mantine/core/styles/CheckboxCard.css';
import '@mantine/core/styles/CheckboxIndicator.css';
import '@mantine/core/styles/Chip.css';
import '@mantine/core/styles/Code.css';
import '@mantine/core/styles/ColorInput.css';
import '@mantine/core/styles/ColorPicker.css';
import '@mantine/core/styles/ColorSwatch.css';
import '@mantine/core/styles/Combobox.css';
import '@mantine/core/styles/Container.css';
import '@mantine/core/styles/Dialog.css';
import '@mantine/core/styles/Divider.css';
import '@mantine/core/styles/Drawer.css';
import '@mantine/core/styles/Fieldset.css';
import '@mantine/core/styles/Grid.css';
import '@mantine/core/styles/Image.css';
import '@mantine/core/styles/Indicator.css';
import '@mantine/core/styles/Kbd.css';
import '@mantine/core/styles/List.css';
import '@mantine/core/styles/LoadingOverlay.css';
import '@mantine/core/styles/Mark.css';
import '@mantine/core/styles/Menu.css';
import '@mantine/core/styles/Modal.css';
import '@mantine/core/styles/NavLink.css';
import '@mantine/core/styles/Notification.css';
import '@mantine/core/styles/NumberInput.css';
import '@mantine/core/styles/Pagination.css';
import '@mantine/core/styles/PasswordInput.css';
import '@mantine/core/styles/Pill.css';
import '@mantine/core/styles/PillsInput.css';
import '@mantine/core/styles/PinInput.css';
import '@mantine/core/styles/Progress.css';
import '@mantine/core/styles/Radio.css';
import '@mantine/core/styles/RadioCard.css';
import '@mantine/core/styles/RadioIndicator.css';
import '@mantine/core/styles/Rating.css';
import '@mantine/core/styles/RingProgress.css';
import '@mantine/core/styles/SegmentedControl.css';
import '@mantine/core/styles/SemiCircleProgress.css';
import '@mantine/core/styles/SimpleGrid.css';
import '@mantine/core/styles/Skeleton.css';
import '@mantine/core/styles/Slider.css';
import '@mantine/core/styles/Spoiler.css';
import '@mantine/core/styles/Stack.css';
import '@mantine/core/styles/Stepper.css';
import '@mantine/core/styles/Switch.css';
import '@mantine/core/styles/Table.css';
import '@mantine/core/styles/TableOfContents.css';
import '@mantine/core/styles/Tabs.css';
import '@mantine/core/styles/Text.css';
import '@mantine/core/styles/ThemeIcon.css';
import '@mantine/core/styles/Timeline.css';
import '@mantine/core/styles/Title.css';
import '@mantine/core/styles/Tooltip.css';
import '@mantine/core/styles/Tree.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

import {
    Badge,
    createTheme,
    Drawer,
    Input,
    MantineColorsTuple,
    Menu,
    RadioGroup,
    ScrollArea,
    Textarea,
    TextInput,
    NumberInput,
    PasswordInput,
    PillsInput,
    PinInput,
    ColorInput,
    Checkbox,
    InputLabel,
    InputDescription,
    InputError,
    Radio,
    MultiSelect,
    Select,
    InputWrapper,
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
        red: systemRed,
        green: systemGreen,
    },
    primaryColor: 'brand',
    primaryShade: 5,

    components: {
        Menu: Menu.extend({
            styles: {
                label: {
                    fontSize: 'var(--label-font-size)',
                    fontWeight: 500,
                    marginBottom: 'var(--ce-size-sm)',
                },
                dropdown: {
                    borderRadius: 'var(--callout-offset)',
                    padding: 'calc(var(--ce-size-xl) * var(--ce-halfstep-dec))',
                    gap: 'var(--ce-size-3xs)',
                },
                itemLabel: {fontWeight: 400},
                item: {
                    fontSize: 'var(--callout-font-size)',
                    minHeight: 'var(--ce-size-xl)',
                    borderRadius: 'var(--callout-offset)',
                },
                itemSection: {fontSize: 'var(--callout-font-size)', paddingInlineEnd: 'var(--ce-size-sm)'},
            },
        }),
        Drawer: Drawer.extend({
            defaultProps: {
                position: 'right',
                size: '100%',
                transitionProps: {transition: 'fade-left', duration: 150, timingFunction: 'linear'},
                scrollAreaComponent: ScrollArea.Autosize,
            },
            styles: {body: {padding: 0, overflow: 'hidden'}},
        }),
        Input: Input.extend({
            defaultProps: {size: 'md'},
            styles: {
                wrapper: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
            },
        }),
        InputWrapper: InputWrapper.extend({
            defaultProps: {size: 'md'},
            styles: {
                root: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {marginBottom: 'var(--ce-size-sm)', fontWeight: 400},
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        InputLabel: InputLabel.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
            },
        }),
        InputDescription: InputDescription.extend({
            defaultProps: {size: 'md'},
            styles: {
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
            },
        }),
        InputError: InputError.extend({
            defaultProps: {size: 'md'},
            styles: {
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        TextInput: TextInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                wrapper: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        MultiSelect: MultiSelect.extend({
            defaultProps: {size: 'md'},
            styles: {
                wrapper: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        Select: Select.extend({
            defaultProps: {size: 'md'},
            styles: {
                wrapper: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        Textarea: Textarea.extend({
            defaultProps: {size: 'md'},
            styles: {
                wrapper: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        NumberInput: NumberInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                wrapper: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        PasswordInput: PasswordInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                wrapper: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        PillsInput: PillsInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                wrapper: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        PinInput: PinInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
            },
        }),
        ColorInput: ColorInput.extend({
            defaultProps: {size: 'md'},
            styles: {
                wrapper: {marginBottom: 'var(--ce-size-sm)', height: 'unset'},
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                },
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),
        Checkbox: Checkbox.extend({
            defaultProps: {size: 'md'},
            styles: {
                input: {
                    borderRadius: 'var(--ce-size-sm)',
                },
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),

        RadioGroup: RadioGroup.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 600,
                },
            },
        }),

        Radio: Radio.extend({
            defaultProps: {size: 'md'},
            styles: {
                label: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
                description: {
                    marginBottom: 'var(--ce-size-sm)',
                    fontWeight: 400,
                },
                error: {
                    marginBottom: 'var(--ce-size-2xs)',
                    fontWeight: 400,
                },
            },
        }),

        Badge: Badge.extend({defaultProps: {size: 'md'}, styles: {root: {fontWeight: 600}}}),
    },
});
