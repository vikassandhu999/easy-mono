import React from 'react';
import {
    ControllerProps as $ControllerProps,
    Controller,
    ControllerFieldState,
    ControllerRenderProps,
    FieldPath,
    FieldValues,
    UseFormStateReturn,
} from 'react-hook-form';

type ControllerProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TTransformedValues = TFieldValues,
> = Omit<$ControllerProps<TFieldValues, TName, TTransformedValues>, 'render'> & {
    render: ({
        field,
        fieldState,
        formState,
    }: {
        field: ControllerRenderProps<TFieldValues, TName> & {error?: string};
        fieldState: ControllerFieldState;
        formState: UseFormStateReturn<TFieldValues>;
    }) => React.ReactElement;
};

export default function EasyController<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TTransformedValues = TFieldValues,
>(props: ControllerProps<TFieldValues, TName, TTransformedValues>) {
    return (
        <Controller
            {...props}
            render={(renderProps) =>
                props.render({
                    ...renderProps,
                    field: {...renderProps.field, error: renderProps.fieldState.error?.message},
                })
            }
        />
    );
}
