import Mongoose = require('mongoose');
import {EntityChange} from '../../core/enums/entity-change';
import * as CoreUtils from '../../core/utils';
import {PrincipalContext} from '../../security/auth/principalContext';
import * as Enumerable from 'linq';
import {getDbSpecifcModel} from '../db';
import {pathRepoMap, getModel, getSchema} from '../../core/dynamic/model-entity';
import {MetaData} from '../../core/metadata/metadata';
import {Decorators} from '../../core/constants/decorators';

export function castToMongooseType(value, schemaType) {
    var newVal;
    switch (schemaType) {
        case Mongoose.Types.ObjectId:
            if (value instanceof Mongoose.Types.ObjectId) {
                newVal = value;
            } else if (typeof value === 'string') {
                newVal = new Mongoose.Types.ObjectId(value);
            } else {
                throw 'cannot cast to primary key type';
            }
            break;
        case String:
            if (typeof value === 'string') {
                newVal = value;
            }
            newVal = value.toString();
            break;
        case Number:
            if (typeof value === 'number') {
                newVal = value;
            }
            newVal = parseInt(value);
            if (isNaN(newVal)) {
                throw 'cannot cast to primary key type';
            }
            break;
        default: newVal = value; break;
    }
    return newVal;
}

export function getPropertiesFromObject(changedObj: any): Array<string> {
    return Enumerable.from(changedObj).select((x: any) => x.key).toArray();
}

/**
 * return json from mongoose object
 * @param result
 */
export function toObject(result): any {
    if (result instanceof Array) {
        return Enumerable.from(result).select((x:any) => x.toObject()).toArray();
    }
    return result ? result.toObject() : null;
}

/**
 * It creates list of properties to set/unset/push.
 * If array is passed, then for put whole array is replaced but for patch array is updated. For e.g.
 * Case 'put': Suppose there is an object {'ids':['1']}. On put {'ids':['2']}, it will result {'ids':['2']}.
 * Case 'patch': Suppose there is an object {'ids':['1']}. On patch {'ids':['2']}, it will result {'ids':['1', '2']}.
 * @param obj
 * @param type
 */
export function getUpdatedProps(obj: any, type: EntityChange) {
    var push = {};
    var set = {};
    var unset = {};
    var s = false, u = false, p = false;
    for (var i in obj) {
        if (obj[i] == undefined || obj[i] == null || obj[i] == undefined && obj[i] == '' || (obj[i] instanceof Array && obj[i] == []) || obj[i] == {}) {
            unset[i] = obj[i];
            u = true;
        }
        else {
            if (type == EntityChange.patch && obj[i] instanceof Array) {
                push[i] = {
                    $each: obj[i]
                }
                p = true;
            }
            else {
                set[i] = obj[i];
                s = true;
            }
        }
    }

    var json = {};
    if (s) {
        json['$set'] = set;
    }
    if (u) {
        json['$unset'] = unset;
    }
    if (p) {
        json['$push'] = push;
    }

    return json;
}

export function isPropertyUpdateRequired(changedProps: Array<string>, properties: [string]) {
    if (properties && properties.length > 0) {
        if (Enumerable.from(properties).any(x => changedProps.indexOf(x) > -1))
            return true;
    }

    if (!changedProps || changedProps.length == 0)
        return false;
    else if (!properties || properties.length == 0)
        return true;
    else {
        if (Enumerable.from(properties).any(x => changedProps.indexOf(x) > -1))
            return true;
        else
            return false;
    }
}

export function getCurrentDBModel(schemaName) {
    var model = getModel(schemaName);
    return getDbSpecifcModel(schemaName, model.schema);
}

export function getMongoUpdatOperatorForRelation(meta: MetaData) {
    var operator = "";
    switch (meta.decorator) {
        case Decorators.ONETOMANY: // for array of objects
            operator = '.$';
            break;
        case Decorators.MANYTOMANY: // for array of objects
            operator = '.$';
            break;
        case Decorators.MANYTOONE: // for single object
            operator = "";
            break;
        case Decorators.ONETOONE: // for single object
            operator = "";
            break;
    }

    return operator;

}