export interface IAssociationParams {
    rel: string,
    itemType: Object,
    embedded?: boolean,
    eagerLoading: boolean,
    deleteCascade?: boolean,
    properties?: Array<string>,
    persist?: boolean,
    storageType?:string,
    propertyKey?:string,
    foreignKey?:string
}