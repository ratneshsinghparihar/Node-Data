export interface IAssociationParams {
    rel: string,
    itemType: Object,
    embedded: boolean,
    eagerLoading: boolean,
    deleteCascade?: boolean,
    properties?: [string],
    persist?: boolean
}