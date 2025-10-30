import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface UncommittedLabel {
    createdAt: string;
    label: string;
    value: string;
}

export interface PlanLabelsState {
    uncommittedLabels: Record<string, Record<number, UncommittedLabel[]>>;
}

const initialState: PlanLabelsState = {
    uncommittedLabels: {},
};

const planLabelsSlice = createSlice({
    name: 'planLabels',
    initialState,
    reducers: {
        addUncommittedLabel: (
            state,
            action: PayloadAction<{
                planId: string;
                dayOfWeek: number;
                label: string;
                value: string;
            }>,
        ) => {
            const {planId, dayOfWeek, label, value} = action.payload;

            if (!state.uncommittedLabels[planId]) {
                state.uncommittedLabels[planId] = {};
            }
            if (!state.uncommittedLabels[planId][dayOfWeek]) {
                state.uncommittedLabels[planId][dayOfWeek] = [];
            }

            // Prevent duplicates
            const exists = state.uncommittedLabels[planId][dayOfWeek].some((l) => l.value === value);

            if (!exists) {
                state.uncommittedLabels[planId][dayOfWeek].push({
                    label,
                    value,
                    createdAt: new Date().toISOString(),
                });
            }
        },

        commitLabel: (
            state,
            action: PayloadAction<{
                planId: string;
                dayOfWeek: number;
                value: string;
            }>,
        ) => {
            const {planId, dayOfWeek, value} = action.payload;
            const labels = state.uncommittedLabels[planId]?.[dayOfWeek];

            if (labels) {
                state.uncommittedLabels[planId][dayOfWeek] = labels.filter((l) => l.value !== value);
            }
        },

        deleteUncommittedLabel: (
            state,
            action: PayloadAction<{
                planId: string;
                dayOfWeek: number;
                value: string;
            }>,
        ) => {
            const {planId, dayOfWeek, value} = action.payload;
            const labels = state.uncommittedLabels[planId]?.[dayOfWeek];

            if (labels) {
                state.uncommittedLabels[planId][dayOfWeek] = labels.filter((l) => l.value !== value);
            }
        },

        clearPlanLabels: (state, action: PayloadAction<{planId: string}>) => {
            delete state.uncommittedLabels[action.payload.planId];
        },
    },
});

export const {addUncommittedLabel, commitLabel, deleteUncommittedLabel, clearPlanLabels} = planLabelsSlice.actions;

export default planLabelsSlice.reducer;
