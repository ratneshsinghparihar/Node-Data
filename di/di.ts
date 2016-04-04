let Enumerable: any = require('linq');
import {MetaUtils} from '../core/metadata/utils';
import {Decorators} from '../core/constants';
import {DecoratorType} from '../core/enums/decorator-type';
import {MetaData} from '../core/metadata/metadata';
import {ClassType, NodeModuleType} from '../core/utils/types';
import {IInjectParams} from './decorators/interfaces/inject-params';

import * as Utils from '../core/utils';

let _extSources: Array<(any) => Object> = [];
let _depInstMap = new Map();
let _serviceMap = new Map<ClassType<any>, Object>();

export function extSources(extSources?: Array<(any) => Object>) {
    if (extSources !== undefined) {
        _extSources = extSources;
    }
    return _extSources;
}

export function serviceMap(serviceMap?: Map<ClassType<any>, Object>) {
    if (serviceMap !== undefined) {
        _serviceMap = serviceMap;
    }
    return _serviceMap;
}
//var services: Array<{ fn: Function, params: {} }> = [];
//var serviceInstances: Array<{fn: Function, inst: any}> = [];

function generateToken(fn: Function) {
    return fn.toString();
}

class DependencyNode {
    parents: Map<ClassType<any>, boolean>;
    current: any;
    children: Map<ClassType<any>, boolean>;
    constructor(data) {
        this.parents = new Map<ClassType<any>, boolean>();
        this.children = new Map<ClassType<any>, boolean>();;
        this.current = data;
    }
}

let dependencyRoot: Map<ClassType<any>, DependencyNode> = new Map();

let dependencyOrder: Map<ClassType<any>, number>;

class DI {
    private stack: Array<{ parent: any; children: Array<any> }> = [];

    public resolveDependencies<T>(cls: ClassType<T>): T {
        if (_serviceMap.has(cls)) {
            return this.resolveServiceDependency<T>(cls, _serviceMap.get(cls));
        }
        return this.getFromExtSources<T>(cls);
    }

    private getFromExtSources<T>(cls: ClassType<any>): T {
        let inst;
        _extSources.forEach(func => {
            if (!inst) {
                inst = func.apply(this, [cls]);
            }
        });
        return inst;
    }

    private getDependencyOrderString(cls?: ClassType<any>) {
        let arr = [];
        dependencyOrder.forEach((value: number, key: ClassType<any>) => {
            arr.push(key.name);
        });
        cls && arr.push(cls.name);
        return arr.join('=>');
    }

    private resolveServiceDependency<T>(cls: ClassType<T>, service): T {
        let inst;
        if (!service.singleton) {
            inst = this.instantiateClass<T>(cls);
        }
        inst = this.getInstance(cls);
        if (inst) {
            return inst;
        } else {
            inst = this.instantiateClass<T>(cls);
        }
        return inst;
    }

    private getInstance<T>(cls: ClassType<T>): T {
        return _depInstMap.get(cls);
    }

    private getDependencies(cls: ClassType<any>): Array<MetaData> {
        return Enumerable.from(MetaUtils.getMetaData(cls.prototype, Decorators.INJECT));
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
        let resolvedDeps = [];
        Enumerable.from(deps)
            .orderBy((x: MetaData) => x.paramIndex)
            .forEach((x: MetaData) => {
                let type = (<IInjectParams>x.params).type;

                if ((<any>type).default) {
                        type = (<any>type).default;
                }
                if (!type) {
                    console.log(x);
                    throw 'no type found';
                }
                resolvedDeps.push(this.resolveDependencies(type));
            });
        return resolvedDeps;
    }

    private getType(params: any): ClassType<any> {
        let type = (<IInjectParams>params).type;
        if ((<any>type).__esModule) {
            type = (<any>type).default;
        }
        return type;
    }

    private resolvePropDeps(inst: any, propDeps: Array<any>) {
        Enumerable.from(propDeps)
            .forEach((x: MetaData) => {
                inst[x.propertyKey] = this.resolveDependencies((<IInjectParams>x.params).type);
            });
    }
    //private instantiateClass<T extends Function>(fn: T): T {}

    private getCycle<T>(parent: ClassType<T>, child: ClassType<T>) {
        let arr = Enumerable.from(this.stack)
            .select(x => x.parent.name)
            .toArray();
        arr.push(parent.name, child.name);
        return arr.join(" => ");
    }

    // todo: cyclic dependency
    private instantiateClass<T>(cls: ClassType<T>): T {
        console.log('get dependencies: ' + cls.name);

        let allDependencies = this.getDependencies(cls);
        let deps = this.constructorDeps(allDependencies);
        let str = Enumerable.from(deps)
            .select((x: MetaData) => this.getType(x.params) ? this.getType(x.params).name : ' @ ')
            .toArray()
            .join(",");
        console.log("       " + str);

        if (!dependencyRoot.get(cls)) {
            dependencyRoot.set(cls, new DependencyNode(cls));
        }

        Enumerable.from(deps)
            .forEach((x: MetaData) => {

                let type = this.getType(x.params);
                if (!dependencyRoot.get(type)) {
                    dependencyRoot.set(type, new DependencyNode(type));
                }
                dependencyRoot.get(cls).children.set(type, true);

                if (dependencyRoot.get(type).children.get(cls)) {
                    let cycleDepStr = this.getCycle(cls, type);
                    throw Error('Cycle found: ' + cycleDepStr);
                }

                dependencyRoot.get(type).parents.set(cls, true);
            });

        this.stack.push({ parent: cls, children: deps });
        let injectedProps = this.publicDeps(allDependencies);

        let resolvedDeps = this.resolveConstructorDeps(deps);
        let inst = Utils.activator<T>(cls, resolvedDeps);
        this.resolvePropDeps(inst, injectedProps);

        _depInstMap.set(cls, inst);

        this.stack.pop();
        return inst;
    }
}

export interface IContainer {
    addService<T>(cls: ClassType<T>, params: any);
    resolve<T>(cls: ClassType<T>): T;
    resolve<T>(module: NodeModuleType<T>): T;
    addSource(source: (any) => Object);
}

export class Container {
    /**
     * Registers all the services, i.e. classes having @service decorator, in the DI container.
     * DI container will inject only those services that are registered with this method.
     * @param {class} cls Typescript class having @service decorator
     * @param {Object} params Decorator params
     */
    public static addService<T>(cls: ClassType<T>, params: any) {
        _serviceMap.set(cls, params);
    }

    /**
     * 
     * @param cls
     */
    public static resolve<T>(key: ClassType<T>|NodeModuleType<T>): T {
        let srvKey: ClassType<T> = <any>key;
        if ((<NodeModuleType<any>>key).__esModule) {
            srvKey = (<NodeModuleType<any>>key).default;
        }
        dependencyOrder = dependencyOrder || new Map<ClassType<any>, number>();
        let di = new DI();
        return di.resolveDependencies<T>(srvKey);
    }

    public static addSource(source: (any) => Object) {
        _extSources.push(source);
        //source.forEach((x, y) => {
        //    if (_depInstMap.has(y)) {
        //        throw 'key already present in the map';
        //    }
        //    _depInstMap.set(y, x);
        //});
    }
}