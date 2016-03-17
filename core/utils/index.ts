var Enumerable: any = require('linq');
import Mongoose = require("mongoose");
import {ClassType} from './classtype';
import {IEntityService} from '../interfaces/entity-service';

let _config: any = {};
let _entityService: IEntityService;

export function config(config?: any) {
    if (!(config === undefined)) {
        _config = config;
    }
    return _config;
}

export function entityService(entityService?: IEntityService): IEntityService {
    if (!(entityService === undefined)) {
        _entityService = entityService;
    }
    return _entityService;
}

export function getDesignType(target: Object|Function, prop: string) {
    return (<any>Reflect).getMetadata("design:type", target, prop);
}

export function getDesignParamType(target: Object | Function, prop: string, parameterIndex: number) {
    return (<any>Reflect).getMetadata("design:paramtypes", target, prop);
}


export function activator<T>(cls: ClassType, args?: Array<any>): T {
    return new (Function.prototype.bind.apply(cls, [null].concat(args)));
    //function F(): void {
    //    return <any>cls.constructor.apply(this, args);
    //}
    //F.prototype = <any>cls.constructor.prototype;
    //return new F();
}

export function isRelationDecorator(decorator: string) {
    return decorator === 'onetomany' || decorator === 'manytoone' || decorator === 'manytomany';
}