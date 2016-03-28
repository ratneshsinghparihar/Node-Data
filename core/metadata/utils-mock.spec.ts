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


function mockDecoratorObject(target, decorator, params, propertyKey?, paramIndex?): any {
    var obj = {};
    obj[decorator] = {};
    propertyKey = propertyKey || MetadataConstants.CLASSDECORATOR_PROPKEY;
    obj[decorator][propertyKey] = {};
    obj[decorator][propertyKey] = mockMetadata(MyTestClass1.prototype, decorator, {}, propertyKey, 1);
    return obj;
}

function mockMetadata(target, decorator, params, propertyKey?, paramIndex?) {
    return new MetaData(target, false, decorator, DecoratorType.METHOD, params, propertyKey, paramIndex);
}

export function generateMockMetaRoot() {
    let mockMetaRoot: MetaRoot = new Map();
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator1', {}));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator1', {}, 'method1'));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator1', {}, 'method1', 0));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator1', {}, 'method1', 1));

    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator2', {}));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator2', {}, 'method1'));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator2', {}, 'method1', 0));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator2', {}, 'method1', 1));

    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator1', {}));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator1', {}, 'method2'));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator1', {}, 'method2', 0));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator1', {}, 'method2', 1));

    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator2', {}));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator2', {}, 'method2'));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator2', {}, 'method2', 0));
    mockMetaRoot.set(MyTestClass1.prototype, mockDecoratorObject(MyTestClass1.prototype, 'decorator2', {}, 'method2', 1));
    //-----------------------------------------------------------------------------------------------------------------------------
    mockMetaRoot.set(MyTestClass2.prototype, mockDecoratorObject(MyTestClass2.prototype, 'decorator1', {}));
    mockMetaRoot.set(MyTestClass2.prototype, mockDecoratorObject(MyTestClass2.prototype, 'decorator1', {}, 'method1'));
    mockMetaRoot.set(MyTestClass2.prototype, mockDecoratorObject(MyTestClass2.prototype, 'decorator1', {}, 'method1', 0));
    mockMetaRoot.set(MyTestClass2.prototype, mockDecoratorObject(MyTestClass2.prototype, 'decorator1', {}, 'method1', 1));
    //-----------------------------------------------------------------------------------------------------------------------------

}