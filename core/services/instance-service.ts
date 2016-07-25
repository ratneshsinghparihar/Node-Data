import {getEntity} from '../dynamic/model-entity';
import * as utils from "../utils";
import {MetaData} from '../metadata/metadata';
import {IAssociationParams} from '../decorators/interfaces';
var Enumerable: linqjs.EnumerableStatic = require('linq');

export class InstanceService {

    static getInstance(entity: any, id: any, param: any) {
        if (id) {
            var meta = utils.getPrimaryKeyMetadata(entity);
            if (meta) {
                param[meta.propertyKey] = id;
            }
        }
        InstanceService.initProperties(entity, param);
        return InstanceService.getInstanceFromType(entity, param);
    }

    static getInstanceFromType(type: any, param?: any) {
        var t: (param) => void = type.constructor;
        return InstanceService.getNewInstance(t, param);
    }

    private static getNewInstance(t: any, param?: any) {
        var newInstance = new t(param);
        if (param) {
            for (var prop in param) {
                newInstance[prop] = param[prop];
            }
        }
        return newInstance;
    }

    private static initProperties(type: any, param: any) {
        var metas = utils.getAllRelationsForTargetInternal(type);
        if (metas) {
            metas.forEach(x => {
                let meta = <MetaData>x;
                let p = <IAssociationParams>meta.params;
                if (param[meta.propertyKey]) {
                    var value = param[meta.propertyKey];
                    if (meta.propertyType.isArray) {
                        if (value.length > 0 && utils.isJSON(value[0])) {
                            var res = [];
                            Enumerable.from(value).forEach(x => {
                                res.push(InstanceService.getNewInstance(p.itemType, x));
                            });
                            param[meta.propertyKey] = res;
                        }
                    }
                    else {
                        if (utils.isJSON(value)) {
                            param[meta.propertyKey] = InstanceService.getNewInstance(p.itemType, value)
                        }
                    }
                }
            });
        }
    }
}