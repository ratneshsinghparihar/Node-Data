import {DecoratorType} from '../enums';
import {Decorators, MetadataConstants} from '../constants';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {MetaRoot} from '../metadata/interfaces/metaroot';
import {MetaData} from '../metadata/metadata';
import {DecoratorMetaData} from '../metadata/interfaces/decorator-metadata';

export class MyTestClass1 {
    method1(param1, param2) { }
}
export class MyTestClass2 {
    method1(param1, param2) { }
}
export class MyTestClass3 {
    method1(param1, param2) { }
}

function getMetaPropKey(decoratorType, propertyKey, paramIndex) {
    let metaPropKey = propertyKey;
    if (decoratorType === DecoratorType.CLASS || (decoratorType === DecoratorType.PARAM && !propertyKey)) {
        metaPropKey = MetadataConstants.CLASSDECORATOR_PROPKEY;
    }
    if (decoratorType === DecoratorType.PARAM) {
        metaPropKey = metaPropKey + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex;
    }
    return metaPropKey;
}

function mockDecoratorObject(obj, target, decoratorType: DecoratorType, decorator, params, propertyKey?, paramIndex?): any {
    obj[decorator] = obj[decorator] || {};
    let metaPropKey = getMetaPropKey(decoratorType, propertyKey, paramIndex);
    obj[decorator][metaPropKey] = obj[decorator][metaPropKey] || {};
    obj[decorator][metaPropKey] = mockMetadata(target, decorator, {}, propertyKey, paramIndex);
}

function mockMetadata(target, decorator, params, propertyKey?, paramIndex?) {
    return new MetaData(target, false, decorator, DecoratorType.METHOD, params, propertyKey, paramIndex);
}

export function generateMockMetaRoot() {
    let mockMetaRoot: MetaRoot = new Map();
    let obj = {}
        , decorator1 = 'decorator1'
        , decorator2 = 'decorator2'
        , method1 = 'method1'
        , method2 = 'method2';

    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.CLASS, decorator1, {});
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.CLASS, decorator2, {});

    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.METHOD, decorator1, {}, method1);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.METHOD, decorator1, {}, method2);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.METHOD, decorator2, {}, method1);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.METHOD, decorator2, {}, method2);

    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.PARAM, decorator1, {}, method1, 0);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.PARAM, decorator1, {}, method1, 1);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.PARAM, decorator1, {}, method2, 0);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.PARAM, decorator1, {}, method2, 1);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.PARAM, decorator2, {}, method1, 0);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.PARAM, decorator2, {}, method1, 1);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.PARAM, decorator2, {}, method2, 0);
    mockDecoratorObject(obj, MyTestClass1.prototype, DecoratorType.PARAM, decorator2, {}, method2, 1);

    mockMetaRoot.set(MyTestClass1.prototype, <any>obj);
    //-----------------------------------------------------------------------------------------------------------------------------
    obj = {};
    mockDecoratorObject(obj, MyTestClass2.prototype, DecoratorType.CLASS, decorator1, {});
    mockDecoratorObject(obj, MyTestClass2.prototype, DecoratorType.METHOD, decorator1, {}, method1);
    mockDecoratorObject(obj, MyTestClass2.prototype, DecoratorType.PARAM, decorator1, {}, method1, 0);
    mockDecoratorObject(obj, MyTestClass2.prototype, DecoratorType.PARAM, decorator1, {}, method1, 1);

    mockMetaRoot.set(MyTestClass2.prototype, <any>obj);
    //-----------------------------------------------------------------------------------------------------------------------------
    return mockMetaRoot;
}