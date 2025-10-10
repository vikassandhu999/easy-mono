// Custom hooks
export {useDragAndDrop} from './hooks/useDragAndDrop';
export {useSessionItems} from './hooks/useSessionItems';

// Main SessionBuilder component
export {default as SessionBuilder} from './SessionBuilder';
export {default as SessionCard} from './SessionCard';
export {default as SessionCreateForm} from './SessionCreateForm';

// Form utilities and types
export type {SessionFormValues} from './sessionForm';
export {
    createDefaultFormValues,
    SessionFormSchema,
    toCreateSessionPayload,
    toUpdateSessionPayload,
} from './sessionForm';

export {default as SessionItem} from './SessionItem';
export {default as SessionItemsManager} from './SessionItemsManager';
// Session type field components
export {default as InstructionSettingsFields} from './sessionTypes/InstructionSettingsFields';
export {default as MealSettingsFields} from './sessionTypes/MealSettingsFields';

export {default as MeasurementSettingsFields} from './sessionTypes/MeasurementSettingsFields';
export {default as WorkoutSettingsFields} from './sessionTypes/WorkoutSettingsFields';

// Backend types re-exported for convenience
export type {ContentDetail, Session, SessionItemConfig, SessionType} from '@/api/sessions';
