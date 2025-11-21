import {DRAWER_KEYS} from '@/configs';

/**
 * Type-safe drawer parameters
 * Maps each drawer key to its required parameters
 */
export type DrawerParams = {
    [DRAWER_KEYS.CONTENT_CREATE]: Record<string, never>;
    [DRAWER_KEYS.RECIPE_CREATE]: Record<string, never>;
    [DRAWER_KEYS.RECIPE_VIEW]: {recipe_id: string};
    [DRAWER_KEYS.RECIPE_EDIT]: {recipe_id: string};
    [DRAWER_KEYS.NUTRITION_PLAN_CREATE]: Record<string, never>;
    [DRAWER_KEYS.NUTRITION_PLAN_EDIT]: {nutrition_plan_id: string};
    [DRAWER_KEYS.NUTRITION_PLAN_BUILDER]: {nutrition_plan_id: string; day_number?: string};
};

/**
 * Extract drawer key from DrawerParams
 */
export type DrawerKey = keyof DrawerParams;

/**
 * Get params type for a specific drawer
 */
export type GetDrawerParams<K extends DrawerKey> = DrawerParams[K];

/**
 * Common form submission handler type
 */
export type FormSubmitHandler<T = any> = (values: T) => Promise<void>;

/**
 * Drawer action handlers
 */
export interface DrawerActions {
    onClose: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onSave?: () => void;
}
