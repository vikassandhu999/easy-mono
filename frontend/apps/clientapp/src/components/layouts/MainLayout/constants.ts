import {HouseIcon, ChatsIcon, UserIcon, CalendarIcon} from '@phosphor-icons/react';
import {NavItem} from './types';

export const navItems: NavItem[] = [
    {icon: HouseIcon, label: 'Home', href: '/'},
    {icon: CalendarIcon, label: 'Schedule', href: '/schedule'},
    {icon: ChatsIcon, label: 'chats', href: '/chats'},
    {icon: UserIcon, label: 'Profile', href: '/profile'},
    // {icon: GearIcon, label: 'Settings', href: '/settings'},
];

// Schedule/Calendar related types and constants
export type ScheduleWeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const SCHEDULE_WEEK_DAYS = [
  { label: "Mon", value: "monday" as ScheduleWeekDay },
  { label: "Tue", value: "tuesday" as ScheduleWeekDay },
  { label: "Wed", value: "wednesday" as ScheduleWeekDay },
  { label: "Thu", value: "thursday" as ScheduleWeekDay },
  { label: "Fri", value: "friday" as ScheduleWeekDay },
  { label: "Sat", value: "saturday" as ScheduleWeekDay },
  { label: "Sun", value: "sunday" as ScheduleWeekDay },
];

// Time slot related types and constants
export type ScheduleTimeSlot =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "all-day"
  | "custom";

export const SCHEDULE_TIME_SLOTS = [
  {
    id: "morning" as ScheduleTimeSlot,
    title: "Morning",
    timeRange: "6:00 AM - 12:00 PM",
  },
  {
    id: "afternoon" as ScheduleTimeSlot,
    title: "Afternoon",
    timeRange: "12:00 PM - 6:00 PM",
  },
  {
    id: "evening" as ScheduleTimeSlot,
    title: "Evening",
    timeRange: "6:00 PM - 10:00 PM",
  },
  {
    id: "night" as ScheduleTimeSlot,
    title: "Night",
    timeRange: "10:00 PM - 6:00 AM",
  },
  {
    id: "all-day" as ScheduleTimeSlot,
    title: "All Day",
    timeRange: "Flexible timing",
  },
  {
    id: "custom" as ScheduleTimeSlot,
    title: "Custom Time",
    timeRange: "Set your own time",
  },
];