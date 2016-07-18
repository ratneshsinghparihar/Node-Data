import {getEntity} from '../dynamic/model-entity';
import * as utils from "../utils";

export class InstanceService {

    static getInstance(path: string, id: any, param: any) {
        var t = getEntity(path);
        var meta = utils.getPrimaryKeyMetadata(t);
        if (meta) {
            param[meta.propertyKey] = id;
        }

        var type: (param) => void = t.constructor;
        var newInstance = new type(param);
        if (param) {
            for (var prop in param) {
                newInstance[prop] = param[prop];
            }
        }
        return newInstance;
    }

    static getInstanceFromType(type: any) {
        var t: () => void = type.constructor;
        var newInstance = new t();
        return newInstance;
    }
}