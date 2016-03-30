import * as DI from './di';
import {MetaUtils} from '../core/metadata/utils';
import {MetaData} from '../core/metadata/metadata';
import {Decorators} from '../core/constants';
import {DecoratorType} from '../core/enums/decorator-type';
import {ClassType} from '../core/utils/classtype';

import {ServiceA} from './tests/service-a';
import {ServiceB} from './tests/service-b';
import {ServiceC} from './tests/service-c';
import {ServiceD} from './tests/service-d';
import {CyclicA} from './tests/cyclic-a';
import {CyclicB} from './tests/cyclic-b';

describe('di - Container', () => {
    let _srvMap = DI.serviceMap();
    let params = { a: 1 };
    beforeEach(() => {
    });

    describe('addService', () => {
        it('should add services in the container', () => {
            DI.Container.addService(ServiceA, params);
            expect(_srvMap.get(ServiceA)).toBe(params);
        });

    });

    describe('resolve', () => {
        beforeEach(() => {
            let _serviceMap = new Map<ClassType<any>, Object>();
            let singletonParam = { singleton: true }
                , nonSingletonParam = { singleton: false };
            _serviceMap.set(ServiceA, singletonParam);
            _serviceMap.set(ServiceB, nonSingletonParam);
            _serviceMap.set(ServiceC, nonSingletonParam);
            _serviceMap.set(ServiceD, singletonParam);
            _serviceMap.set(CyclicA, {});
            _serviceMap.set(CyclicB, {});
            DI.serviceMap(_serviceMap);

            // inject decorators
            let srvBMeta = new MetaData(ServiceB.prototype, true, Decorators.INJECT, DecoratorType.PARAM, { type: ServiceA }, null, 0);
            let srvC1Meta = new MetaData(ServiceC.prototype, true, Decorators.INJECT, DecoratorType.PARAM, { type: ServiceA }, null, 0);
            let srvC2Meta = new MetaData(ServiceC.prototype, true, Decorators.INJECT, DecoratorType.PARAM, { type: ServiceB }, null, 1);
            let srvD1Meta = new MetaData(ServiceD.prototype, true, Decorators.INJECT, DecoratorType.PARAM, { type: ServiceA }, null, 0);
            let srvD2Meta = new MetaData(ServiceD.prototype, true, Decorators.INJECT, DecoratorType.PARAM, { type: ServiceB }, null, 1);
            let srvD3Meta = new MetaData(ServiceD.prototype, true, Decorators.INJECT, DecoratorType.PARAM, { type: ServiceC }, null, 2);

            let srvCycAMeta = new MetaData(CyclicA.prototype, true, Decorators.INJECT, DecoratorType.PARAM, { type: CyclicB }, null, 0);
            let srvCycBMeta = new MetaData(CyclicB.prototype, true, Decorators.INJECT, DecoratorType.PARAM, { type: CyclicA }, null, 0);

            spyOn(MetaUtils, 'getMetaData').and.callFake((target, decorator) => {
                switch (target) {
                    case ServiceB.prototype: return [srvBMeta];
                    case ServiceC.prototype: return [srvC1Meta, srvC2Meta];
                    case ServiceD.prototype: return [srvD1Meta, srvD2Meta, srvD3Meta];
                    case CyclicA.prototype: return [srvCycAMeta];
                    case CyclicB.prototype: return [srvCycBMeta];
                    default: return [];
                }
            });
        });

        it('should resolve services', () => {
            expect(DI.Container.resolve(ServiceA) instanceof ServiceA).toBeTruthy();
            expect(DI.Container.resolve(ServiceB) instanceof ServiceB).toBeTruthy();
        });

        it('should be singleton is singleton=true in params', () => {
            let srvA1 = DI.Container.resolve(ServiceA);
            let srvA2 = DI.Container.resolve(ServiceA);
            let srvB1 = DI.Container.resolve(ServiceB);
            let srvB2 = DI.Container.resolve(ServiceB);
            let srvC1 = DI.Container.resolve(ServiceC);
            let srvC2 = DI.Container.resolve(ServiceC);
            let srvD1 = DI.Container.resolve(ServiceD);
            let srvD2 = DI.Container.resolve(ServiceD);

            expect(srvA1).toBe(srvA2);
            expect(srvD1).toBe(srvD2);
            expect(srvA1).toBe(srvB1.serviceA);
            expect(srvA1).toBe(srvC1.serviceA);
            expect(srvA1).toBe(srvD1.serviceA);
            // since ServiceD is singleton, does not matter it its internal injected items are singleton
            expect(srvD1.serviceA).toBe(srvD2.serviceA);
            expect(srvD1.serviceB).toBe(srvD2.serviceB);
            expect(srvD1.serviceC).toBe(srvD2.serviceC);
        });

        it('should not be singleton if singleton=false in params', () => {
            let srvB1 = DI.Container.resolve(ServiceB);
            let srvB2 = DI.Container.resolve(ServiceB);
            let srvC1 = DI.Container.resolve(ServiceC);
            let srvC2 = DI.Container.resolve(ServiceC);
            let srvD1 = DI.Container.resolve(ServiceD);
            let srvD2 = DI.Container.resolve(ServiceD);
            expect(srvB1).not.toBe(srvB2);
            expect(srvC1.serviceB).not.toBe(srvC2.serviceB);
        });

        it('should resolve from external sources', () => {
            class TestClass1 { }
            class TestClass2 { }
            let testInst = new TestClass1();
            let func = function (x) {
                if (x === TestClass1) {
                    return testInst;
                }
            }
            DI.Container.addSource(func);
            let inst = DI.Container.resolve(TestClass1);
            expect(inst).toBe(testInst);
            expect(DI.Container.resolve(TestClass2)).toBeFalsy();
        });

        it('should throw cyclic dependency error if there is a cycle', () => {
            debugger;
            expect(() => DI.Container.resolve(CyclicA)).toThrowError(/Cycle found.*/);
        });
    });
});
