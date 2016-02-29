/// <reference path="../typings/linq/linq.3.0.3-Beta4.d.ts" />

var Enumerable: linqjs.EnumerableStatic = require('linq');
import * as MetaUtils from '../decorators/metadata/utils';
import {Decorators} from '../constants';
import {DecoratorType} from '../enums/decorator-type';
import {MetaData} from '../decorators/metadata/metadata';
import {ClassType} from '../utils/classtype';
import {IInjectParams} from '../decorators/interfaces/inject-params';
import * as Utils from '../utils';

var serviceInstMap = new Map();
var serviceMap = new Map();

//var services: Array<{ fn: Function, params: {} }> = [];
//var serviceInstances: Array<{fn: Function, inst: any}> = [];

function generateToken(fn: Function) {
    return fn.toString();
}

export class DI {
    addService(fn: Function, params: any) {
        serviceMap.set(fn, params);
        //services.push({ fn: fn, params: params });
    }

    resolve<T>(cls: ClassType): T {
        var service = serviceMap.get(cls);
        if (!service) {
            return null;
        }

        if (!service.singleton) {
            return this.instantiateClass<T>(cls);
        }
        var inst = this.getInstance(cls);
        if (inst) {
            return inst;
        }
        return this.instantiateClass<T>(cls);
    }

    private getInstance(cls: ClassType): any {
        return serviceInstMap.get(cls);
        //return Enumerable.from(serviceInstances)
        //    .firstOrDefault(x => x.fn === cls, null);
    }

    private getDependencies(cls: ClassType): Array<MetaData> {
        return Enumerable.from(MetaUtils.getAllMetaDataForDecorator(cls.prototype, Decorators.INJECT))
            .select(keyVal => keyVal.value)
            .toArray();
    }

    private publicDeps(deps: Array<MetaData>): Array<MetaData> {
        return Enumerable.from(deps)
            .where((x: MetaData) => x.decoratorType === DecoratorType.PROPERTY)
            .toArray();
    }

    private constructorDeps(deps: Array<MetaData>): Array<MetaData> {
        return Enumerable.from(deps)
            .where((x: MetaData) => x.decoratorType === DecoratorType.PARAM)
            .toArray();
    }

    private resolveConstructorDeps(deps): Array<any> {
        var resolvedDeps = [];
        Enumerable.from(deps)
            .orderBy((x: MetaData) => x.paramIndex)
            .forEach((x: MetaData) => {
                resolvedDeps.push(this.resolve((<IInjectParams>x.params).type));
            });
        return resolvedDeps;
    }

    private resolvePropDeps(inst: any, propDeps: Array<any>) {
        Enumerable.from(propDeps)
            .forEach((x: MetaData) => {
                inst[x.propertyKey] = this.resolve((<IInjectParams>x.params).type);
            });
    }
    //private instantiateClass<T extends Function>(fn: T): T {}

    // todo: cyclic dependency
    private instantiateClass<T>(cls: ClassType): T {
        var allDependencies = this.getDependencies(cls);
        var deps = this.constructorDeps(allDependencies);
        var injectedProps = this.publicDeps(allDependencies);

        var resolvedDeps = this.resolveConstructorDeps(deps);
        var inst = Utils.activator<T>(cls, resolvedDeps);
        this.resolvePropDeps(inst, injectedProps);

        serviceInstMap.set(cls, inst);
        //serviceInstances.push({ fn: cls, inst: inst });
        return inst;
    }
}