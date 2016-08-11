/// <reference path="../../security/auth/user.ts" />
/// <reference path="../../mongoose/db.ts" />
/// <reference path="../../security/auth/principalContext.ts" />
import {PrincipalContext} from '../../security/auth/principalContext';
import {User} from '../../security/auth/user';
import {getDbSpecifcModel} from '../../mongoose/db';
var schemaNameModel: { [key: string]: any } = {};
export var pathRepoMap: { [key: string]: { schemaName: string, modelType: string } } = <any>{};

export function updateModelEntity(schemaName: string, entity: any, model: any, schema: any) {
    if (!schemaNameModel[schemaName]) {
        schemaNameModel[schemaName] = { entity: entity, model: model ,schema: schema };
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
    //let currentUser: User = PrincipalContext.User;
    //if (currentUser && currentUser.getDbName()) {
    //    return getDbSpecifcModel(schemaName, schemaNameModel[schemaName]['schema'], currentUser.getDbName());
    //}
    return schemaNameModel[schemaName]['model'];
}