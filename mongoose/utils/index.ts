import Mongoose = require('mongoose');
import {EntityChange} from '../../core/enums/entity-change';
import * as CoreUtils from '../../core/utils';
import {PrincipalContext} from '../../security/auth/principalContext';
import * as Enumerable from 'linq';
import {getDbSpecifcModel} from '../db';
import {pathRepoMap, getModel, getSchema} from '../../core/dynamic/model-entity';
import {MetaData} from '../../core/metadata/metadata';
import {Decorators} from '../../core/constants/decorators';
import {Types} from "mongoose";
import { ConstantKeys } from '../../core/constants';

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
export function getUpdatedProps(obj: any, type: EntityChange, jsonMapProp?: Array<any>) {
    var push = {};
    var set = {};
    var unset = {};
    var s = false, u = false, p = false;
    let orginalDbEntity = obj.__dbEntity;
    for (var key in obj) {
        if (key === "__dbEntity") {
            continue;
        }
        let curValue = obj[key];
        if (curValue == undefined || curValue == null ||
            curValue == undefined && curValue == '' ||
            (curValue instanceof Array && !curValue.length ) ) {
            if (orginalDbEntity && curValue === orginalDbEntity[key]) { // add json.parse(json.stringify)
                continue;
            }

            if (curValue instanceof Array && orginalDbEntity && orginalDbEntity[key].length == curValue.length)
            {
                continue;
            }            
            unset[key] = '';
            delete obj[key]; // make sure data should consistent for master collection with embedded entities
            u = true;
        }
        else {
            if (type == EntityChange.patch && curValue instanceof Array) {
                push[key] = {
                    $each: curValue
                }
                p = true;
            }
            else {
                if (type == EntityChange.patch && jsonMapProp && jsonMapProp.indexOf(key) >= 0) {
                    for (var j in curValue) {
                        set[key + '.' + j] = curValue[j];
                        s = true;
                    }
                }
                else if (!(curValue instanceof Function)) {
                    // do not set for not modified keys
                    // in case of object, use JSON.stringify to compare serialize object.
                    if (!Array.isArray(curValue) && curValue instanceof Object && orginalDbEntity) {
                        let serializeOrgObj = JSON.stringify(orginalDbEntity[key]);
                        let serializeCurObj = JSON.stringify(curValue);
                        if (serializeCurObj == serializeOrgObj) {
                            continue;
                        }
                    }
                    // in case of string, number, boolean etc. direct compare.
                    if (orginalDbEntity && curValue === orginalDbEntity[key]) { // add json.parse(json.stringify)
                        continue;
                    }
                    set[key] = curValue;
                    s = true;
                }
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

export function isBasonOrStringType(obj: any) {
    if (!obj) {
        return undefined;
    }
    return obj instanceof Types.ObjectId || typeof obj === "string";
}

export function getParentKey(modelName, prop, id) {
    let parent = {};
    parent[ConstantKeys.collectionName] = modelName;
    parent[ConstantKeys.property] = prop;
    parent[ConstantKeys.parentId] = id;
    return parent;
}
export function pushPropToArrayOrObject(prop:any,propVal:any,collecionObj:any,isFlat:boolean){
    if(isFlat){
        collecionObj[prop] = propVal;
    }else{
        collecionObj.push(propVal);
    }
}