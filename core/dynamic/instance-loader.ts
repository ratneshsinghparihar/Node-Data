import {getEntity} from './model-entity';
import * as utils from "../utils";

export class InstanceLoader {
    static getInstance(path: string, id: any, param: any) {
        var t = getEntity(path);
        var meta = utils.getPrimaryKeyMetadata(t);
        param[meta.propertyKey] = id;

        var type: (param) => void = t.constructor;
        var newInstance = new type(param);

        return newInstance;
    }
}