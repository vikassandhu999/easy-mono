export type Muscle = {
    id: string;
    name: string;
    group: null | string;
};

export type MusclesListOpts = {
    search?: string;
};

export interface MusclesList {
    data: Muscle[];
}
