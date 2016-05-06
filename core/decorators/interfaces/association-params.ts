export interface IAssociationParams {
    rel: string,
    itemType: Object,
    embedded: boolean,
    persist: boolean,
    eagerLoading: boolean,
    deleteCascade?: boolean
}