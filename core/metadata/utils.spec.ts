/// <reference path="../../typings/jasmine/jasmine.d.ts" />
/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
/// <reference path="../../typings/linq/linq.3.0.3-Beta4.d.ts" />

require('reflect-metadata/reflect');
var Enumerable: linqjs.EnumerableStatic = require('linq');
import * as MetadataUtils from './utils';
import {MetaData} from './metadata';
import * as models from '../../unit-test/models/testModels';
import {initializeModels} from '../../unit-test/InitializeModels';
import {DecoratorType} from '../enums';
import {Decorators, MetadataConstants} from '../constants';
import {MetaRoot} from '../metadata/interfaces/metaroot';
import {DecoratorMetaData} from '../metadata/interfaces/decorator-metadata';
import {generateMockMetaRoot, MyTestClass1, MyTestClass2, MyTestClass3, Constants} from './utils-mock';


function compareAddedMetadata(meta: MetaData, target, decorator, decType, isStatic, params, propKey, paramIndex): void {
    expect(meta.target).toEqual(target);
    expect(meta.decorator).toEqual(decorator);
    expect(meta.decoratorType).toEqual(decType);
    expect(meta.isStatic).toEqual(isStatic);
    expect(meta.params).toEqual(params);
    expect(meta.propertyKey).toEqual(propKey);
    expect(meta.paramIndex).toEqual(paramIndex);
}

describe('metautils', () => {
    class TestClassNew { }
    let metadataRoot: MetaRoot;

    beforeEach(() => {
        MetadataUtils.metadataRoot(generateMockMetaRoot());
        metadataRoot = MetadataUtils.metadataRoot();
    });

    describe('addMetaData', () => {
        let param = { a: 1 }
            , propKey = 'testmethod'
            , dec = 'testdecorator'
            , paramIndex = 0;

        it('should store function prototype as metadata key', () => {
            expect(metadataRoot.has(TestClassNew)).toBeFalsy();
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(TestClassNew.prototype,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.METHOD,
                    params: param,
                    propertyKey: propKey
                })).toBeTruthy();
            expect(metadataRoot.has(TestClassNew)).toBeFalsy();
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
        });

        it('should store function prototype as metadata key (even if function is given as target)', () => {
            expect(metadataRoot.has(TestClassNew)).toBeFalsy();
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(TestClassNew,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.METHOD,
                    params: param,
                    propertyKey: propKey
                })).toBeTruthy();
            expect(metadataRoot.has(TestClassNew)).toBeFalsy();
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
        });

        it('should throw typeerror if target is null/undefined', () => {
            expect(() => MetadataUtils.MetaUtils.addMetaData(undefined,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.CLASS,
                    params: param
                })).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.addMetaData(null,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.CLASS,
                    params: param
                })).toThrowError(<any>TypeError);
        });

        it('should throw typeerror if propKey is null/undefined for property or method decorator', () => {
            expect(() => MetadataUtils.MetaUtils.addMetaData(TestClassNew,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.PROPERTY,
                    params: param,
                    propertyKey: undefined
                })).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.addMetaData(TestClassNew,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.PARAM,
                    params: param,
                    propertyKey: null
                })).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.addMetaData(TestClassNew,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.METHOD,
                    params: param,
                    propertyKey: undefined
                })).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.addMetaData(TestClassNew,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.METHOD,
                    params: param,
                    propertyKey: null
                })).toThrowError(<any>TypeError);
        });

        it('should return false if metadata is already added for the given target, decorator, prop and/or param', () => {
            // Add duplicates
            expect(MetadataUtils.MetaUtils.addMetaData(MyTestClass1,
                {
                    decorator: Constants.DECORATOR1,
                    decoratorType: DecoratorType.CLASS,
                    params: param
                })).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(MyTestClass1.prototype,
                {
                    decorator: Constants.DECORATOR1,
                    decoratorType: DecoratorType.METHOD,
                    params: param,
                    propertyKey: Constants.METHOD1
                })).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(MyTestClass1,
                {
                    decorator: Constants.DECORATOR1,
                    decoratorType: DecoratorType.METHOD,
                    params: param,
                    propertyKey: Constants.METHOD1
                })).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(MyTestClass1.prototype,
                {
                    decorator: Constants.DECORATOR1,
                    decoratorType: DecoratorType.PARAM,
                    params: param,
                    propertyKey: Constants.METHOD1,
                    paramIndex: paramIndex
                })).toBeFalsy();
        });

        it('should add metadata in the metadata root for class type decorator', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(TestClassNew,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.CLASS,
                    params: param
                })).toBeTruthy();
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][MetadataConstants.CLASSDECORATOR_PROPKEY];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.CLASS, true, param, undefined, undefined);
        });

        it('should add metadata in the metadata root for method type decorator', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(TestClassNew.prototype,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.METHOD,
                    params: param,
                    propertyKey: propKey
                })).toBeTruthy();
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][propKey];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.METHOD, false, param, propKey, undefined);
        });

        it('should add metadata in the metadata root for method type decorator for static method', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(TestClassNew,
            {
                    decorator: dec,
                    decoratorType: DecoratorType.METHOD,
                    params: param,
                    propertyKey: propKey
                })).toBeTruthy();
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][propKey];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.METHOD, true, param, propKey, undefined);
        });

        it('should add metadata in the metadata root for param type decorator for constructor', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(TestClassNew,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.PARAM,
                    params: param,
                    propertyKey: undefined,
                    paramIndex: paramIndex
                })).toBeTruthy();
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let key = MetadataConstants.CLASSDECORATOR_PROPKEY + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex;
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][key];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.PARAM, true, param, undefined, 0);
        });

        it('should add metadata in the metadata root for param type decorator', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            expect(MetadataUtils.MetaUtils.addMetaData(TestClassNew.prototype,
                {
                    decorator: dec,
                    decoratorType: DecoratorType.PARAM,
                    params: param,
                    propertyKey: propKey,
                    paramIndex: paramIndex
                })).toBeTruthy();
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][propKey + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.PARAM, false, param, propKey, 0);
        });
    });

    describe('getMetadata', function () {
        it('should throw typeerror if target is null or undefined and called with any number or arguments', () => {
            expect(() => MetadataUtils.MetaUtils.getMetaData(undefined)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(undefined, 'dec')).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(undefined, 'dec', 'prop')).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(undefined, 'dec', 'prop', 0)).toThrowError(<any>TypeError);

            expect(() => MetadataUtils.MetaUtils.getMetaData(null)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(null, 'dec')).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(null, 'dec', 'prop')).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(null, 'dec', 'prop', 0)).toThrowError(<any>TypeError);
        });

        it('should throw typeerror decorator is null or undefined with arguments length >= 2', () => {
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, undefined)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, undefined, 'prop1')).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, undefined, 'prop1', 0)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, undefined)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, null)).toThrowError(<any>TypeError);
        });

        it('should throw typeerror if propKey is null with arguments length == 3', () => {
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'dec1', undefined)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'dec1', undefined)).toThrowError(<any>TypeError);
        });

        // constructor params decorator
        it('should not throw typeerror if propKey is null/undefined with arguments length == 4', () => {
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'dec1', undefined, 0)).not.toThrowError(<any>TypeError);
        });

        it('should throw typeerror if paramIndex is null/undefined/lessThanZero with arguments length == 4', () => {
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'dec1', 'prop1', -1)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'dec1', 'prop1', undefined)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'dec1', 'prop1', null)).toThrowError(<any>TypeError);
        });

        it('should return null if target is not present in the root', () => {
            expect(MetadataUtils.MetaUtils.getMetaData(TestClassNew.prototype)).toBe(null);
            expect(MetadataUtils.MetaUtils.getMetaData(TestClassNew.prototype, Constants.DECORATOR1)).toBe(null);
            expect(MetadataUtils.MetaUtils.getMetaData(TestClassNew.prototype, Constants.DECORATOR1, Constants.METHOD1)).toBe(null);
            expect(MetadataUtils.MetaUtils.getMetaData(TestClassNew.prototype, Constants.DECORATOR1, Constants.METHOD1, 0)).toBe(null);
        });

        it('with target should return metadata for that target only', () => {
            let metaArray = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype);
            expect(metaArray.length).toEqual(14);
            metaArray.forEach(x => expect(x.target).toBe(MyTestClass1.prototype));
        });

        it('with target and decorator should return metadata for that combination only', () => {
            let metaArray = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, Constants.DECORATOR1);
            expect(metaArray.length).toEqual(7);
            metaArray.forEach(x => expect(x.target === MyTestClass1.prototype && x.decorator === Constants.DECORATOR1).toBeTruthy());
        });

        it('with target, decorator and propertyKey should return metadata for that combination only', () => {
            let meta = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, Constants.DECORATOR1, Constants.METHOD1);
            expect(meta.target === MyTestClass1.prototype
                && meta.decorator === Constants.DECORATOR1
                && meta.propertyKey === Constants.METHOD1
                && meta.paramIndex === undefined).toBeTruthy();
        });

        it('with target, decorator, propertyKey and paramIndex should return metadata for that combination only', () => {
            let meta = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, Constants.DECORATOR1, Constants.METHOD1, 0);
            expect(meta.target === MyTestClass1.prototype
                && meta.decorator === Constants.DECORATOR1
                && meta.propertyKey === Constants.METHOD1
                && meta.paramIndex === 0).toBeTruthy();
        });
    });

    describe('getMetaDataForDecorators', function () {
        it('should return empty array if decorators object is null or empty', () => {
            expect(MetadataUtils.MetaUtils.getMetaDataForDecorators(null).length).toEqual(0);
            expect(MetadataUtils.MetaUtils.getMetaDataForDecorators([]).length).toEqual(0);
        });

        it('should return metadata for that target that have the given decorators', () => {
            let meta = MetadataUtils.MetaUtils.getMetaDataForDecorators([Constants.DECORATOR1]);
            expect(meta.length).toEqual(2);
            expect(meta[0].target === meta[1].target).toBeFalsy();
            expect(meta[0].target === MyTestClass1.prototype || meta[1].target === MyTestClass1.prototype).toBeTruthy();
            expect(meta[0].target === MyTestClass2.prototype || meta[1].target === MyTestClass2.prototype).toBeTruthy();

            expect(meta[0].metadata.length + meta[1].metadata.length).toEqual(11);

            meta[0].metadata.forEach(x => {
                expect(x.target).toBe(meta[0].target);
                expect(x.decorator === Constants.DECORATOR1);
            });
            meta[1].metadata.forEach(x => {
                expect(x.target).toBe(meta[1].target);
                expect(x.decorator === Constants.DECORATOR1);
            });
        });
    });

    describe('getMetaDataForPropKey', () => {
        it('should throw typeerror if target is null or undefined and called with any number or arguments', () => {
            expect(() => MetadataUtils.MetaUtils.getMetaDataForPropKey(undefined, Constants.METHOD1)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.MetaUtils.getMetaDataForPropKey(null, Constants.METHOD1)).toThrowError(<any>TypeError);
        });

        it('should return null if target is not present in the root', () => {
            expect(MetadataUtils.MetaUtils.getMetaDataForPropKey(TestClassNew.prototype)).toBe(null);
            expect(MetadataUtils.MetaUtils.getMetaDataForPropKey(TestClassNew.prototype, Constants.METHOD1)).toBe(null);
        });

        it('should return metadata for that target that have the given propertyKey', () => {
            let meta = MetadataUtils.MetaUtils.getMetaDataForPropKey(MyTestClass1.prototype, Constants.METHOD1);
            expect(meta.length).toEqual(2);

            meta.forEach(x => {
                expect(x.propertyKey === Constants.METHOD1);
                expect(x.paramIndex === undefined);
            });
        });

        it('should return metadata for that target that have the given propertyKey and paramIndex', () => {
            let meta = MetadataUtils.MetaUtils.getMetaDataForPropKey(MyTestClass1.prototype, Constants.METHOD1, 0);
            expect(meta.length).toEqual(2);

            meta.forEach(x => {
                expect(x.propertyKey === Constants.METHOD1);
                expect(x.paramIndex === 0);
            });
        });
    });

    describe('getMetaPropKey', () => {
        let testMethod = 'testMethod'
            , paramIndex = 0;
        it('should return the proper key for metadata property for class type decorator', () => {
            expect(MetadataUtils.getMetaPropKey(DecoratorType.CLASS)).toEqual(MetadataConstants.CLASSDECORATOR_PROPKEY);
            expect(MetadataUtils.getMetaPropKey(DecoratorType.CLASS, testMethod)).toEqual(MetadataConstants.CLASSDECORATOR_PROPKEY);
            expect(MetadataUtils.getMetaPropKey(DecoratorType.CLASS, testMethod, paramIndex)).toEqual(MetadataConstants.CLASSDECORATOR_PROPKEY);
        })

        it('should throw error if propKey is null/undefined for method type decorator', () => {
            expect(() => MetadataUtils.getMetaPropKey(DecoratorType.METHOD)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.getMetaPropKey(DecoratorType.METHOD, null)).toThrowError(<any>TypeError);
        })

        it('should return the proper key for metadata property for method type decorator', () => {
            expect(() => MetadataUtils.getMetaPropKey(DecoratorType.METHOD)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.getMetaPropKey(DecoratorType.METHOD, null)).toThrowError(<any>TypeError);
            expect(MetadataUtils.getMetaPropKey(DecoratorType.METHOD, testMethod)).toEqual(testMethod);
            expect(MetadataUtils.getMetaPropKey(DecoratorType.METHOD, testMethod, paramIndex)).toEqual(testMethod);
        })

        it('should throw error if paramindex is null/undefined/negative for param type decorator', () => {
            expect(() => MetadataUtils.getMetaPropKey(DecoratorType.PARAM, testMethod)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.getMetaPropKey(DecoratorType.PARAM, testMethod, null)).toThrowError(<any>TypeError);
            expect(() => MetadataUtils.getMetaPropKey(DecoratorType.PARAM, testMethod, -1)).toThrowError(<any>TypeError);
        })

        it('should return the proper key for metadata property for param type decorator', () => {
            expect(MetadataUtils.getMetaPropKey(DecoratorType.PARAM, undefined, paramIndex))
                .toEqual(MetadataConstants.CLASSDECORATOR_PROPKEY + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex);
            expect(MetadataUtils.getMetaPropKey(DecoratorType.PARAM, null, paramIndex))
                .toEqual(MetadataConstants.CLASSDECORATOR_PROPKEY + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex);
            expect(MetadataUtils.getMetaPropKey(DecoratorType.PARAM, testMethod, paramIndex))
                .toEqual(testMethod + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex);
        })
    });
});
