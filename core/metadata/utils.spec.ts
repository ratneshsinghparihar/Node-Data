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
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {MetaRoot} from '../metadata/interfaces/metaroot';
import {DecoratorMetaData} from '../metadata/interfaces/decorator-metadata';
import {generateMockMetaRoot, MyTestClass1, MyTestClass2, MyTestClass3} from './utils-mock.spec.ts';
var jasmine = require('jasmine');

describe('metautils', () => {
    let metadataRoot: MetaRoot;
    beforeEach(() => {
        MetadataUtils.metadataRoot(generateMockMetaRoot());
        metadataRoot = MetadataUtils.metadataRoot();
    });
    describe('addMetaData', () => {
        class TestClassNew { }
        let param = { a: 1 };
        it('should add metadata in the metadata root for class type decorator', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            MetadataUtils.MetaUtils.addMetaData(TestClassNew, 'dec1', DecoratorType.CLASS, param);
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)['dec1'][MetadataConstants.CLASSDECORATOR_PROPKEY];
            expect(meta.target === TestClassNew.prototype
                && meta.decorator === 'dec1'
                && meta.decoratorType === DecoratorType.CLASS
                && meta.isStatic === true
                && meta.params === param
                && meta.propertyKey === MetadataConstants.CLASSDECORATOR_PROPKEY
                && meta.paramIndex === undefined).toBeTruthy();
        });
        it('should add metadata in the metadata root for method type decorator', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            MetadataUtils.MetaUtils.addMetaData(TestClassNew.prototype, 'dec1', DecoratorType.METHOD, param, 'm1');
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)['dec1'][MetadataConstants.CLASSDECORATOR_PROPKEY];
            expect(meta.target === TestClassNew.prototype
                && meta.decorator === 'dec1'
                && meta.decoratorType === DecoratorType.METHOD
                && meta.isStatic === false
                && meta.params === param
                && meta.propertyKey === 'm1'
                && meta.paramIndex === undefined).toBeTruthy();
        });
        it('should add metadata in the metadata root for method type decorator for static method', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            MetadataUtils.MetaUtils.addMetaData(TestClassNew, 'dec1', DecoratorType.METHOD, param, 'm1');
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)['dec1'][MetadataConstants.CLASSDECORATOR_PROPKEY];
            expect(meta.target === TestClassNew.prototype
                && meta.decorator === 'dec1'
                && meta.decoratorType === DecoratorType.METHOD
                && meta.isStatic === true
                && meta.params === param
                && meta.propertyKey === 'm1'
                && meta.paramIndex === undefined).toBeTruthy();
        });
        it('should add metadata in the metadata root for param type decorator', () => {
            expect(metadataRoot.has(TestClassNew.prototype)).toBeFalsy();
            MetadataUtils.MetaUtils.addMetaData(TestClassNew.prototype, 'dec1', DecoratorType.PARAM, param, 'm1', 0);
            expect(metadataRoot.has(TestClassNew.prototype)).toBeTruthy();
            let meta = metadataRoot.get(TestClassNew.prototype)['dec1'][MetadataConstants.CLASSDECORATOR_PROPKEY];
            expect(meta.target === TestClassNew.prototype
                && meta.decorator === 'dec1'
                && meta.decoratorType === DecoratorType.PARAM
                && meta.isStatic === false
                && meta.params === param
                && meta.propertyKey === 'm1'
                && meta.paramIndex === 0).toBeTruthy();
        });
    });
    describe('getMetadata', function () {
        it('with target should return metadata for that target only', () => {
            let meta = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype);
            expect(Object.keys(meta)).toEqual(12);
            let metaArray: Array<MetaData> = Enumerable.from(meta)
                .select(keyVal => keyVal.value)
                .select(keyVal => keyVal.value)
                .toArray();
            metaArray.forEach(x => expect(x.target).toBe(MyTestClass1.prototype));
        });
        it('with target and decorator should return metadata for that combination only', () => {
            let meta = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'decorator1');
            expect(Object.keys(meta)).toEqual(8);
            let metaArray: Array<MetaData> = Enumerable.from(meta)
                .select(keyVal => keyVal.value)
                .select(keyVal => keyVal.value)
                .toArray();
            metaArray.forEach(x => expect(x.target === MyTestClass1.prototype && x.decorator === 'decorator1').toBeTruthy());
        });
        it('with target, decorator and propertyKey should return metadata for that combination only', () => {
            let meta = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'decorator1', 'method1');
            expect(Object.keys(meta)).toEqual(3);
            expect(meta
                && meta.target === MyTestClass1.prototype
                && meta.decorator === 'decorator1'
                && meta.propertyKey === 'method1'
                && meta.paramIndex === undefined).toBeTruthy();
        });
        it('with target, decorator, propertyKey and paramIndex should return metadata for that combination only', () => {
            let meta = MetadataUtils.MetaUtils.getMetaData(MyTestClass1.prototype, 'decorator1', 'method1', 0);
            expect(meta
                && meta.target === MyTestClass1.prototype
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

    //describe('Count of relational properties', function () {
    //    it('student', () => {
    //        met = utils.getAllRelationsForTargetInternal(models.student.prototype);
    //        expect(met.length).toEqual(1);
    //    });

    //    it('subject', () => {
    //        met = utils.getAllRelationsForTargetInternal(models.subject.prototype);
    //        expect(met.length).toEqual(0);
    //    });

    //    it('teacher', () => {
    //        met = utils.getAllRelationsForTargetInternal(models.teacher.prototype);
    //        expect(met.length).toEqual(0);
    //    });

    //    it('division', () => {
    //        met = utils.getAllRelationsForTargetInternal(models.division.prototype);
    //        expect(met.length).toEqual(1);
    //    });
    //});

    //describe('Student properties metadata exists', function () {
    //    var prop;

    //    it('student[_id]', function () {
    //        prop = '_id';
    //        var m: MetaData = MetaUtils.getMetaData(models.student.prototype, Decorators.FIELD, prop);
    //        expect(m).toBeDefined();
    //        expect(m.propertyKey).toEqual(prop);
    //    });

    //    it('student[name]', function () {
    //        prop = 'name';
    //        var m: MetaData = MetaUtils.getMetaData(models.student.prototype, Decorators.FIELD, prop);
    //        expect(m).toBeDefined();
    //        expect(m.propertyKey).toEqual(prop);
    //    });

    //    it('student[subjects]', function () {
    //        prop = 'subjects';
    //        var m: MetaData = MetaUtils.getMetaData(models.student.prototype, Decorators.ONETOMANY, prop);
    //        var param = <IAssociationParams>m.params;
    //        console.log(m.propertyType);
    //        expect(m).toBeDefined();
    //        expect(m.propertyKey).toEqual(prop);
    //        expect(param.rel).toBeDefined();
    //        //expect(m.propertyType.isArray).toEqual(true);
    //        expect(m.propertyType.itemType).toEqual(models.subject);
    //    });

    //    it('student[addresses]', function () {
    //        prop = 'addresses';
    //        var m: MetaData = MetaUtils.getMetaData(models.student.prototype, Decorators.FIELD, prop);
    //        console.log(m.propertyType);
    //        expect(m).toBeDefined();
    //    });
    //});
});