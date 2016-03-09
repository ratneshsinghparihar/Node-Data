/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />

require('reflect-metadata/reflect');
var loggedIn = require('connect-ensure-login').ensureLoggedIn;
var expressJwt = require('express-jwt');
import * as utils from './utils';
import {Decorators} from '../../constants';
import {DecoratorType} from '../../enums/decorator-type';
import {Strict} from '../../enums';
import * as models from '../../unit-test/models/testModels';

xdescribe('Utils function', function () {
    //var ut
    //beforeEach(function () {
    //    ut = {
    //        addMetadata: function (a, b, c, d) {
    //            utils.addMetaData(a, b, c, d);
    //        }
    //    }
    //    spyOn(ut, "addMetadata");
    //    ut.addMetadata(
    //});
    var ut;
    beforeEach( () => {
        spyOn(utils, "addMetaData");
        utils.addMetaData(models.student, Decorators.DOCUMENT, DecoratorType.CLASS, { name: models.student.name, strict: Strict.true });

        //spyOn(utils, "getAllMetaDataForAllDecorator").and.callThrough();
        //utils.getAllMetaDataForAllDecorator(models.student);
    });


    it('Add document metadata',  () =>{
        expect(utils.addMetaData).toHaveBeenCalledWith(models.student, Decorators.DOCUMENT, DecoratorType.CLASS, { name: models.student.name, strict: Strict.true });

        //var res = utils.getAllMetaDataForAllDecorator(models.student);
        //console.log(res);
    });

    it('Add document metadata', () =>{
        //expect(utils.addMetaData).toHaveBeenCalledWith(models.student, Decorators.DOCUMENT, DecoratorType.CLASS, { name: models.student.name, strict: Strict.true });
    });
    it('Add document metadata', () =>{
        //expect(utils.addMetaData).toHaveBeenCalledWith(models.student, Decorators.DOCUMENT, DecoratorType.CLASS, { name: models.student.name, strict: Strict.true });
    });


    //var utils;
    //console.log('utils functions');
    //var student = function
    //beforeEach(function() {
    //    utils = jasmine.createSpyObj("Utils", ["isRelationDecorator"]);
    //    utils.isRelationDecorator(){
            
    //    });
    //});
    //expect(
    //beforeAll(function () {isRelationDecorator,isRelationDecorator
    //    import {ParamTypeCustom} from './param-type-custom';
    //    import {Strict, DecoratorType} from '../../enums';
    //    import * as Utils from '../../utils';
    //    import {Decorators} from '../../constants';
    //    var Enumerable: linqjs.EnumerableStatic = require('linq');
    //    import {MetaRoot} from '../interfaces/metaroot';
    //    import {MetaData} from './metadata';
    //    import {DecoratorMetaData} from '../interfaces/decorator-metadata';

    //    import {IDocumentParams, IAssociationParams, IFieldParams, IInjectParams} from '../interfaces/meta-params';
    //    import {IRepositoryParams} from '../interfaces/repository-params';

       
    //    //import * as Config from '../../config';
        
    //    import * as SecurityConfig from '../../security-config';
    //});

    //it('initialize', function () {
    //    expect(true).toBe(true);
    //});

});

xdescribe("A spy", function () {
    var foo, bar, fetchedBar;

    beforeEach(function () {
        foo = {
            setBar: function (value) {
                bar = value;
            },
            getBar: function () {
                return bar;
            }
        };

        spyOn(foo, 'getBar');

        foo.setBar(123);
        fetchedBar = foo.getBar();
    });

    it("tracks that the spy was called", function () {
        expect(foo.getBar).toHaveBeenCalled();
    });

    it("should not affect other functions", function () {
        expect(bar).toEqual(123);
    });

    it("when called returns the requested value", function () {
        expect(fetchedBar).toEqual(123);
    });
});
