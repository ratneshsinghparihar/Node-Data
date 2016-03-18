/// <reference path="../../typings/jasmine/jasmine.d.ts" />
/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
/// <reference path="../../typings/linq/linq.3.0.3-Beta4.d.ts" />

require('reflect-metadata/reflect');
var Enumerable: linqjs.EnumerableStatic = require('linq');
import * as utils from './utils';
import {MetaData} from './metadata';
import * as models from '../../unit-test/models/testModels';
import {initializeModels} from '../../unit-test/InitializeModels';
import {Decorators} from '../constants';
import {IAssociationParams} from '../decorators/interfaces';

describe('Utils function:', function () {
    var met;
    beforeEach(() => {
        initializeModels();
    });

    describe('Metadata count ', function () {
        it('for student', () => {
            met = utils.getAllMetaDataForAllDecorator(models.student.prototype);
            expect(Enumerable.from(met).select(x => x.key).count()).toEqual(5);
        });

        it('for subject', () => {
            met = utils.getAllMetaDataForAllDecorator(models.subject.prototype);
            expect(Enumerable.from(met).select(x => x.key).count()).toEqual(3);
        });

        it('for teacher', () => {
            met = utils.getAllMetaDataForAllDecorator(models.teacher.prototype);
            expect(Enumerable.from(met).select(x => x.key).count()).toEqual(3);
        });

        it('for division', () => {
            met = utils.getAllMetaDataForAllDecorator(models.division.prototype);
            expect(Enumerable.from(met).select(x => x.key).count()).toEqual(4);
        });
    });

    describe('Count of relational properties', function () {
        it('student', () => {
            met = utils.getAllRelationsForTargetInternal(models.student.prototype);
            expect(met.length).toEqual(1);
        });

        it('subject', () => {
            met = utils.getAllRelationsForTargetInternal(models.subject.prototype);
            expect(met.length).toEqual(0);
        });

        it('teacher', () => {
            met = utils.getAllRelationsForTargetInternal(models.teacher.prototype);
            expect(met.length).toEqual(0);
        });

        it('division', () => {
            met = utils.getAllRelationsForTargetInternal(models.division.prototype);
            expect(met.length).toEqual(1);
        });
    });

    describe('Student properties metadata exists', function () {
        var prop;

        it('student[_id]', function () {
            prop = '_id';
            var m: MetaData = utils.getMetaData(models.student.prototype, Decorators.FIELD, prop);
            expect(m).toBeDefined();
            expect(m.propertyKey).toEqual(prop);
        });

        it('student[name]', function () {
            prop = 'name';
            var m: MetaData = utils.getMetaData(models.student.prototype, Decorators.FIELD, prop);
            expect(m).toBeDefined();
            expect(m.propertyKey).toEqual(prop);
        });

        it('student[subjects]', function () {
            prop = 'subjects';
            var m: MetaData = utils.getMetaData(models.student.prototype, Decorators.ONETOMANY, prop);
            var param = <IAssociationParams>m.params;
            console.log(m.propertyType);
            expect(m).toBeDefined();
            expect(m.propertyKey).toEqual(prop);
            expect(param.rel).toBeDefined();
            //expect(m.propertyType.isArray).toEqual(true);
            expect(m.propertyType.itemType).toEqual(models.subject);
        });

        it('student[addresses]', function () {
            prop = 'addresses';
            var m: MetaData = utils.getMetaData(models.student.prototype, Decorators.FIELD, prop);
            console.log(m.propertyType);
            expect(m).toBeDefined();
        });
    });
});