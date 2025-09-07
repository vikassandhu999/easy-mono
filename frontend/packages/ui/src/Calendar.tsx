/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, {useRef} from 'react';
import {
    CalendarState,
    CalendarStateOptions,
    useCalendarState,
} from '@react-stately/calendar';
import {
    createCalendar,
    getWeeksInMonth,
    endOfMonth,
    isSameDay,
    getDayOfWeek,
    isSameMonth,
    CalendarDate,
} from '@internationalized/date';
import {useDateFormatter, useLocale} from '@react-aria/i18n';
import {
    useCalendar,
    useCalendarGrid,
    useCalendarCell,
} from '@react-aria/calendar';

import {useFocusRing} from '@react-aria/focus';

import {useButton} from '@react-aria/button';
import {mergeProps} from '@react-aria/utils';
import {IconArrowLeft, IconArrowRight} from '@tabler/icons-react';

export function Button(props: any) {
    const ref = useRef<any>();
    const {buttonProps} = useButton(props, ref);
    const {focusProps, isFocusVisible} = useFocusRing();
    return (
        <button
            {...mergeProps(buttonProps, focusProps)}
            ref={ref}
            className={`p-2 rounded-full ${props.isDisabled ? 'text-gray-400' : ''} ${
                !props.isDisabled
                    ? 'hover:bg-violet-100 active:bg-violet-200'
                    : ''
            } outline-none ${isFocusVisible ? 'ring-2 ring-offset-2 ring-purple-600' : ''}`}
        >
            {props.children}
        </button>
    );
}

export function CalendarCell({
    state,
    date,
    currentMonth,
}: {
    state: CalendarState;
    date: CalendarDate;
    currentMonth: CalendarDate;
}) {
    const ref = useRef<any>();
    const {cellProps, buttonProps, isSelected, isDisabled, formattedDate} =
        useCalendarCell({date}, state, ref);

    const isOutsideMonth = !isSameMonth(currentMonth, date);

    // The start and end date of the selected range will have
    // an emphasized appearance.
    const isSelectionStart = (state as any).highlightedRange
        ? isSameDay(date, (state as any).highlightedRange.start)
        : isSelected;
    const isSelectionEnd = (state as any).highlightedRange
        ? isSameDay(date, (state as any).highlightedRange.end)
        : isSelected;

    // We add rounded corners on the left for the first day of the month,
    // the first day of each week, and the start date of the selection.
    // We add rounded corners on the right for the last day of the month,
    // the last day of each week, and the end date of the selection.
    const {locale} = useLocale();
    const dayOfWeek = getDayOfWeek(date, locale);
    const isRoundedLeft =
        isSelected && (isSelectionStart || dayOfWeek === 0 || date.day === 1);
    const isRoundedRight =
        isSelected &&
        (isSelectionEnd ||
            dayOfWeek === 6 ||
            date.day === date.calendar.getDaysInMonth(date));

    const {focusProps, isFocusVisible} = useFocusRing();

    return (
        <td
            {...cellProps}
            className={`py-100 relative ${isFocusVisible ? 'z-10' : 'z-0'}`}
        >
            <div
                {...buttonProps}
                {...focusProps}
                ref={ref}
                hidden={isOutsideMonth}
                className={`max-w-1200 max-h-1200 min-w-800 min-h-800 w-full h-full aspect-square outline-none group ${
                    isRoundedLeft ? 'rounded-l-full' : ''
                } ${isRoundedRight ? 'rounded-r-full' : ''} ${
                    isSelected
                        ? 'bg-product-dark-active text-product-light'
                        : ''
                } ${isDisabled ? 'disabled' : ''}`}
            >
                <div
                    className={`w-full h-full rounded-full flex items-center justify-center ${
                        isDisabled ? 'text-gray-400' : ''
                    } ${
                        // Focus ring, visible while the cell has keyboard focus.
                        isFocusVisible
                            ? 'ring-2 group-focus:z-2 ring-violet-600 ring-offset-2'
                            : ''
                    } ${
                        // Darker selection background for the start and end.
                        isSelectionStart || isSelectionEnd
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : ''
                    } ${
                        // Hover state for cells in the middle of the range.
                        isSelected && !(isSelectionStart || isSelectionEnd)
                            ? 'hover:bg-violet-400'
                            : ''
                    } ${
                        // Hover state for non-selected cells.
                        !isSelected && !isDisabled ? 'hover:bg-violet-100' : ''
                    } cursor-default`}
                >
                    {formattedDate}
                </div>
            </div>
        </td>
    );
}

export function CalendarGrid({state}: {state: CalendarState}) {
    const {locale} = useLocale();
    const startDate = state.visibleRange.start;
    const endDate = endOfMonth(startDate);
    const {gridProps, headerProps, weekDays} = useCalendarGrid(
        {
            startDate,
            endDate,
            weekdayStyle: 'short',
        },
        state,
    );

    // Get the number of weeks in the month so we can render the proper number of rows.
    const weeksInMonth = getWeeksInMonth(startDate, locale);

    return (
        <table
            {...gridProps}
            cellPadding="0"
            className="flex-1 mr-auto ml-auto max-w-modal-small w-full"
        >
            <thead
                {...headerProps}
                className="text-gray-600"
            >
                <tr>
                    {weekDays.map((day, index) => (
                        <th
                            className={'pb-400'}
                            key={index}
                        >
                            {day}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {[...new Array(weeksInMonth).keys()].map((weekIndex) => (
                    <tr key={weekIndex}>
                        {state
                            .getDatesInWeek(weekIndex, startDate)
                            .map((date, i) =>
                                date ? (
                                    <CalendarCell
                                        key={i}
                                        state={state}
                                        date={date}
                                        currentMonth={startDate}
                                    />
                                ) : (
                                    <td key={i} />
                                ),
                            )}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export function Calendar(props: CalendarStateOptions) {
    const {locale} = useLocale();
    const state = useCalendarState({
        ...props,
        visibleDuration: {months: 1},
        locale,
        createCalendar,
    });

    const ref = useRef<any>();
    const {calendarProps, prevButtonProps, nextButtonProps} = useCalendar(
        props,
        state,
    );

    const monthDateFormatter = useDateFormatter({
        month: 'long',
        year: 'numeric',
        timeZone: state.timeZone,
    });

    return (
        <div
            {...calendarProps}
            ref={ref}
            className="bg-transparent w-full max-w-md"
        >
            <div className="flex justify-between mb-1000 flex-1 mr-auto ml-auto gap-400 max-w-modal-small w-full">
                <Button
                    {...prevButtonProps}
                    className={'p-button-small-padding'}
                >
                    <IconArrowLeft />
                </Button>
                <h2
                    aria-hidden
                    className="align-center font-bold text-xl text-center"
                >
                    {monthDateFormatter.format(
                        state.visibleRange.start.toDate(state.timeZone),
                    )}
                </h2>
                <Button
                    {...nextButtonProps}
                    className={'p-button-small-padding'}
                >
                    <IconArrowRight />
                </Button>
            </div>

            <CalendarGrid state={state} />
        </div>
    );
}
