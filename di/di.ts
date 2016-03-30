/**
 * DI module
 * @module DI
 */
var Enumerable: any = require('linq');
import {MetaUtils} from '../core/metadata/utils';
import {Decorators} from '../core/constants';
import {DecoratorType} from '../core/enums/decorator-type';
import {MetaData} from '../core/metadata/metadata';
import {ClassType} from '../core/utils/classtype';
import {IInjectParams} from './decorators/interfaces/inject-params';
import {repositoryMap} from '../core/exports/repositories';

import * as Utils from '../core/utils';

var serviceInstMap = new Map();
var serviceMap = new Map();

function generateToken(fn: Function) {
    return fn.toString();
}

class DependencyNode<T> {
    parents: Map<ClassType<T>, boolean>;
    current: any;
    children: Map<ClassType<T>, boolean>;
    constructor(data) {
        this.parents = new Map<ClassType<T>, boolean>();
        this.children = new Map<ClassType<T>, boolean>();;
        this.current = data;
    }
}

let dependencyRoot: Map<ClassType<any>, DependencyNode<any>> = new Map();

let stack: Array<{ parent: any; children: Array<any>}> = [];

export class DI {
    private dependencyOrder: Map<ClassType<any>, number>;

    /**
     * Registers all the services, i.e. classes having @service decorator, in the DI container.
     * DI container will inject only those services that are registered with this method.
     * @param {class} cls Typescript class having @service decorator
     * @param {Object} params Decorator params
     */
    addService<T>(cls: ClassType<T>, params: any) {
        serviceMap.set(cls, params);
    }

    /**
     * 
     * @param {class} cls Typescript class to inject
     */
    resolve<T>(cls: ClassType<T>): T {
        this.dependencyOrder = new Map<ClassType<any>, number>();
        return this.resolveDependencies<T>(cls);
    }

    private getDependencyOrderString<T>(cls?: ClassType<T>) {
        let arr = [];
        this.dependencyOrder.forEach((value: number, key: ClassType<T>) => {
            arr.push(key.name);
        });
        cls && arr.push(cls.name);
        return arr.join('=>');
    }

    private cycle<T>(cls: ClassType<T>): boolean {
        if (this.dependencyOrder.get(cls)) {
            //let arr = [];
            //dependencyOrder.forEach((value: number, key: ClassType) => {
            //    arr.push(key.name);
            //});
            return true;
        }
        return false;
    }

    private resolveDependencies<T>(cls: ClassType<T>): T {
        if (serviceMap.has(cls)) {
            return this.resolveServiceDependency<T>(cls, serviceMap.get(cls));
        }
        return this.resolveRepositoryDependency<T>(cls);
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

    private resolveRepositoryDependency<T>(cls: ClassType<T>): T {
        var map = repositoryMap();
        var repo = Enumerable.from(repositoryMap())
            // TODO: change (keyVal.value.fn.path == cls.prototype.path) to (keyVal.value.fn == cls.prototype). This is workaround for demo.
            .where(keyVal => keyVal.value.fn == cls.prototype)
            .select(keyVal => keyVal.value.repo)
            .firstOrDefault();
        return repo;
    }

    private getInstance<T>(cls: ClassType<T>): any {
        return serviceInstMap.get(cls);
    }

    private getDependencies<T>(cls: ClassType<T>): Array<MetaData> {
        return Enumerable.from(MetaUtils.getMetaData(cls.prototype, Decorators.INJECT))
            .select(keyVal => keyVal)
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
                let type = (<IInjectParams>x.params).type;

                if ((<any>type).default) {
                        type = (<any>type).default;
                }
                if (!type) {
                    console.log(x);
                    throw 'no type found';
                }
                resolvedDeps.push(this.resolve(type));
            });
        return resolvedDeps;
    }

    private getType(params: any): ClassType<any> {
        var type = (<IInjectParams>params).type;
        if ((<any>type).__esModule) {
            type = (<any>type).default;
        }
        return type;
    }

    private resolvePropDeps(inst: any, propDeps: Array<any>) {
        Enumerable.from(propDeps)
            .forEach((x: MetaData) => {
                inst[x.propertyKey] = this.resolve((<IInjectParams>x.params).type);
            });
    }
    //private instantiateClass<T extends Function>(fn: T): T {}

    private getCycle(parent: ClassType<any>, child: ClassType<any>) {
        var arr = Enumerable.from(stack)
            .select(x => x.parent.name)
            .toArray();
        arr.push(parent.name, child.name);
        return arr.join(" => ");
    }

    // todo: cyclic dependency
    private instantiateClass<T>(cls: ClassType<T>): T {
        console.log('get dependencies: ' + cls.name);

        var allDependencies = this.getDependencies(cls);
        var deps = this.constructorDeps(allDependencies);

        var str = Enumerable.from(deps)
            .select((x: MetaData) => this.getType(x.params) ? this.getType(x.params).name : ' @ ')
            .toArray()
            .join(",");
        console.log("       " + str);

        if (!dependencyRoot.get(cls)) {
            dependencyRoot.set(cls, new DependencyNode(cls));
        }

        Enumerable.from(deps)
            .forEach((x: MetaData) => {

                var type = this.getType(x.params);
                if (!dependencyRoot.get(type)) {
                    dependencyRoot.set(type, new DependencyNode(type));
                }
                dependencyRoot.get(cls).children.set(type, true);

                if (dependencyRoot.get(type).children.get(cls)) {
                    let cycleDepStr = this.getCycle(cls, type);
                    throw 'Cycle found: ' + cycleDepStr;
                }

                dependencyRoot.get(type).parents.set(cls, true);
            });

        stack.push({ parent: cls, children: deps });
        var injectedProps = this.publicDeps(allDependencies);

        var resolvedDeps = this.resolveConstructorDeps(deps);
        var inst = Utils.activator<T>(cls, resolvedDeps);
        this.resolvePropDeps(inst, injectedProps);

        serviceInstMap.set(cls, inst);

        stack.pop();
        return inst;
    }
}

export var Container = new DI();