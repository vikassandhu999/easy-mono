export type Equipment = {
    id: string;
    name: string;
};

export type EquipmentListOpts = {
    search?: string;
};

export interface EquipmentList {
    data: Equipment[];
}
