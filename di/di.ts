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

class DependencyNode {
    parents: Map<ClassType, boolean>;
    current: any;
    children: Map<ClassType, boolean>;
    constructor(data) {
        this.parents = new Map<ClassType, boolean>();
        this.children = new Map<ClassType, boolean>();;
        this.current = data;
    }
}

let dependencyRoot: Map<ClassType, DependencyNode> = new Map();

let stack: Array<{ parent: any; children: Array<any>}> = [];

export class DI {
    private dependencyOrder: Map<ClassType, number>;

    addService(fn: Function, params: any) {
        serviceMap.set(fn, params);
        //services.push({ fn: fn, params: params });
    }

    resolve<T>(cls: ClassType): T {
        this.dependencyOrder = new Map<ClassType, number>();
        return this.resolveDependencies<T>(cls);
    }


    private getDependencyOrderString(cls?: ClassType) {
        let arr = [];
        this.dependencyOrder.forEach((value: number, key: ClassType) => {
            arr.push(key.name);
        });
        cls && arr.push(cls.name);
        return arr.join('=>');
    }

    private cycle(cls: ClassType): boolean {
        if (this.dependencyOrder.get(cls)) {
            //let arr = [];
            //dependencyOrder.forEach((value: number, key: ClassType) => {
            //    arr.push(key.name);
            //});
            return true;
        }
        return false;
    }

    private resolveDependencies<T>(cls: ClassType): T {
        var service = serviceMap.get(cls);
        if (!service) {
            return null;
        }

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

    private getType(params: any): ClassType {
        var type = (<IInjectParams>params).type;
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

    private getCycle(parent: ClassType, child: ClassType) {
        var arr = Enumerable.from(stack)
            .select(x => x.parent.name)
            .toArray();
        arr.push(parent.name, child.name);
        return arr.join(" => ");
    }

    // todo: cyclic dependency
    private instantiateClass<T>(cls: ClassType): T {
        //if (this.cycle(cls)) {
        //    throw 'Cycle found: ' + this.getDependencyOrderString(cls);
        //}
        //this.dependencyOrder.set(cls, this.dependencyOrder.size);

        //console.log('Current dependency Order: ', this.getDependencyOrderString());

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
        //serviceInstances.push({ fn: cls, inst: inst });

        // remove the current class from dependency order
        //this.dependencyOrder.delete(cls);

        stack.pop();
        return inst;
    }
}