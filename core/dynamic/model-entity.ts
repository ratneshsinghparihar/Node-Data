
var schemaNameModel: { [key: string]: any } = {};
export var pathRepoMap: { [key: string]: { schemaName: string, modelType: string } } = <any>{};

export function updateModelEntity(schemaName: string, entity: any, model: any) {
    if (!schemaNameModel[schemaName]) {
        schemaNameModel[schemaName] = { entity: entity, model: model };
    }
}

export function getEntity(schemaName: string): any {
    if (!schemaNameModel[schemaName])
        return null;

    return schemaNameModel[schemaName]['entity'];
}

export function getModel(schemaName: string): any {
    if (!schemaNameModel[schemaName])
        return null;

    return schemaNameModel[schemaName]['model'];
}