import { ClassType } from '../core/utils/classtype';
export declare class DI {
    private dependencyOrder;
    addService(fn: Function, params: any): void;
    resolve<T>(cls: ClassType): T;
    private getDependencyOrderString(cls?);
    private cycle(cls);
    private resolveDependencies<T>(cls);
    private resolveServiceDependency<T>(cls, service);
    private resolveRepositoryDependency<T>(cls);
    private getInstance(cls);
    private getDependencies(cls);
    private publicDeps(deps);
    private constructorDeps(deps);
    private resolveConstructorDeps(deps);
    private getType(params);
    private resolvePropDeps(inst, propDeps);
    private getCycle(parent, child);
    private instantiateClass<T>(cls);
}
