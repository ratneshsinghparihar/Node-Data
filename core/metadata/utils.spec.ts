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
import {generateMockMetaRoot, MyTestClass1, MyTestClass2, MyTestClass3} from './utils-mock';


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
    let metadataRoot: MetaRoot;
    beforeEach(() => {
        MetadataUtils.metadataRoot(generateMockMetaRoot());
        metadataRoot = MetadataUtils.metadataRoot();
    });
    describe('addMetaData', () => {
        class TestClassNew { }
        let param = { a: 1 }
            , propKey = 'testmethod'
            , dec = 'testdecorator'
            , paramIndex = 0;

        it('should add metadata in the metadata root for class type decorator', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            MetadataUtils.MetaUtils.addMetaData(TestClassNew, dec, DecoratorType.CLASS, param);
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][MetadataConstants.CLASSDECORATOR_PROPKEY];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.CLASS, true, param, undefined, undefined);
        });

        it('should add metadata in the metadata root for method type decorator', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            MetadataUtils.MetaUtils.addMetaData(TestClassNew.prototype, dec, DecoratorType.METHOD, param, propKey);
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][propKey];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.METHOD, false, param, propKey, undefined);
        });

        it('should add metadata in the metadata root for method type decorator for static method', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            MetadataUtils.MetaUtils.addMetaData(TestClassNew, dec, DecoratorType.METHOD, param, propKey);
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][propKey];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.METHOD, true, param, propKey, undefined);
        });

        it('should add metadata in the metadata root for param type decorator for constructor', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            MetadataUtils.MetaUtils.addMetaData(TestClassNew, dec, DecoratorType.PARAM, param, undefined, paramIndex);
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let key = MetadataConstants.CLASSDECORATOR_PROPKEY + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex;
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][key];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.PARAM, true, param, undefined, 0);
        });

        it('should add metadata in the metadata root for param type decorator', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            MetadataUtils.MetaUtils.addMetaData(TestClassNew.prototype, dec, DecoratorType.PARAM, param, propKey, paramIndex);
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)[dec][propKey + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex];
            expect(meta).toBeTruthy();
            compareAddedMetadata(meta, TestClassNew.prototype, dec, DecoratorType.PARAM, false, param, propKey, 0);
        });
    });

    describe('getMetadata', function () {
        it('should throw typeerror with proper message if target is null or undefined', () => {
            expect(() => MetadataUtils.MetaUtils.getMetaData(null)).toThrowError(<any>TypeError, 'target cannot be null or undefined');
            expect(() => MetadataUtils.MetaUtils.getMetaData(undefined)).toThrowError(<any>TypeError, 'target cannot be null or undefined');
        });

        it('with target should return metadata for that target only', () => {
            debugger;
            let metaArray = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype);
            expect(metaArray.length).toEqual(14);
            metaArray.forEach(x => expect(x.target).toBe(MyTestClass1.prototype));
        });

        it('with target and decorator should return metadata for that combination only', () => {
            let metaArray = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'decorator1');
            expect(metaArray.length).toEqual(7);
            metaArray.forEach(x => expect(x.target === MyTestClass1.prototype && x.decorator === 'decorator1').toBeTruthy());
        });

        it('with target, decorator and propertyKey should return metadata for that combination only', () => {
            let meta = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'decorator1', 'method1');
            debugger;
            expect(meta.target === MyTestClass1.prototype
                && meta.decorator === 'decorator1'
                && meta.propertyKey === 'method1'
                && meta.paramIndex === undefined).toBeTruthy();
        });

        it('with target, decorator, propertyKey and paramIndex should return metadata for that combination only', () => {
            let meta = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'decorator1', 'method1', 0);
            debugger;
            expect(meta.target === MyTestClass1.prototype
                && meta.decorator === 'decorator1'
                && meta.propertyKey === 'method1'
                && meta.paramIndex === 0).toBeTruthy();
        });
    });

    describe('getMetaDataForDecorators', function () {
        it('should return metadata for that target that have the given decorators', () => {
            let meta = MetadataUtils.MetaUtils.getMetaDataForDecorators(['decorator1']);
            expect(meta.length).toEqual(2);
            expect(meta[0].target === meta[1].target).toBeFalsy();
            expect(meta[0].target === MyTestClass1.prototype || meta[1].target === MyTestClass1.prototype).toBeTruthy();
            expect(meta[0].target === MyTestClass2.prototype || meta[1].target === MyTestClass2.prototype).toBeTruthy();

            expect(meta[0].metadata.length + meta[1].metadata.length).toEqual(12);

            meta[0].metadata.forEach(x => {
                expect(x.target).toBe(meta[0].target);
                expect(x.decorator === 'decorator1');
            });
            meta[1].metadata.forEach(x => {
                expect(x.target).toBe(meta[1].target);
                expect(x.decorator === 'decorator1');
            });
        });
    });

    describe('getMetaDataForDecorators', function () {
        it('should return metadata for that target that have the given propertyKey', () => {
            let meta = MetadataUtils.MetaUtils.getMetaDataForPropKey(MyTestClass1.prototype, 'method1');
            expect(meta.length).toEqual(3);

            meta.forEach(x => {
                expect(x.propertyKey === 'method1');
                expect(x.paramIndex === undefined);
            });
        });

        it('should return metadata for that target that have the given propertyKey and paramIndex', () => {
            let meta = MetadataUtils.MetaUtils.getMetaDataForPropKey(MyTestClass1.prototype, 'method1', 0);
            expect(meta.length).toEqual(3);

            meta.forEach(x => {
                expect(x.propertyKey === 'method1');
                expect(x.paramIndex === 0);
            });
        });
    });
});
