/**
 * Library State Management Hook
 *
 * Centralized state management for the library module.
 * Handles content type selection and drawer states.
 */

import {useCallback, useState} from 'react';

import {Content, ContentType} from '@/store/services/contents';

import {VISIBLE_CONTENT_TYPES} from '../constants';
import {DrawerState, LibraryViewState} from '../types';

const INITIAL_DRAWER_STATE: DrawerState = {
    content: null,
    isOpen: false,
};

/**
 * Hook for managing library view state
 *
 * @param initialContentType - Initial content type to display
 * @returns Library state and actions
 */
export function useLibraryState(initialContentType: ContentType = VISIBLE_CONTENT_TYPES[0]) {
    const [state, setState] = useState<LibraryViewState>({
        contentType: initialContentType,
        createDrawer: INITIAL_DRAWER_STATE,
        editDrawer: INITIAL_DRAWER_STATE,
    });

    // Content type selection
    const setContentType = useCallback((contentType: ContentType) => {
        setState((prev) => ({
            ...prev,
            contentType,
            // Close drawers when switching content types
            createDrawer: INITIAL_DRAWER_STATE,
            editDrawer: INITIAL_DRAWER_STATE,
        }));
    }, []);

    // Create drawer actions
    const openCreateDrawer = useCallback(() => {
        setState((prev) => ({
            ...prev,
            createDrawer: {
                content: null,
                isOpen: true,
            },
        }));
    }, []);

    const closeCreateDrawer = useCallback(() => {
        setState((prev) => ({
            ...prev,
            createDrawer: INITIAL_DRAWER_STATE,
        }));
    }, []);

    // Edit drawer actions
    const openEditDrawer = useCallback((content: Content) => {
        setState((prev) => ({
            ...prev,
            editDrawer: {
                content,
                isOpen: true,
            },
        }));
    }, []);

    const closeEditDrawer = useCallback(() => {
        setState((prev) => ({
            ...prev,
            editDrawer: INITIAL_DRAWER_STATE,
        }));
    }, []);

    return {
        // State
        contentType: state.contentType,
        createDrawer: state.createDrawer,
        editDrawer: state.editDrawer,

        // Actions
        closeCreateDrawer,
        closeEditDrawer,
        openCreateDrawer,
        openEditDrawer,
        setContentType,
    };
}
