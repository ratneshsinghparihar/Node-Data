/// <reference path="../mongoose/mongoose-model.ts" />
import * as MongooseModel from '../mongoose/mongoose-model';
import * as Utils from "../mongoose/utils";
import * as modeEntity from '../core/dynamic/model-entity';
import * as mockData from '../unit-test/MockDataForRelation';
import * as db from './db';
import {course} from '../unit-test/models/course';
import {student} from '../unit-test/models/student';

import Mongoose = require("mongoose");
import * as Enumerable from 'linq';
var Q = require('q');

describe('testing relation', () => {
    var mock: mockData.mockedFunctions = new mockData.mockedFunctions();
    var sub1, sub2, student1, student2, res;

    beforeAll(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

        spyOn(Utils, 'castToMongooseType').and.callFake(mock.castToMongooseType);
        spyOn(modeEntity, 'getEntity').and.callFake(mock.getEntity);
        spyOn(modeEntity, 'getModel').and.callFake(mock.getModel);
        spyOn(db, 'getDbSpecifcModel').and.callFake(mock.getDbSpecifcModel);
        mockData.AddAllFakeFunctions();
        spyOn(Q, 'nbind').and.callFake((func, model) => mockData.getFakeFunctionForMongoose(func, model));

        console.log('initialized successfully');
    });

    describe(': fake objects', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
        });

        describe(': course object', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.findAll(mockData.getMongooseModel(course)).then(x => {
                        res = x;
                        done();
                    });
                }, 500);
            });

            it(': exists', (done) => {
                expect(res).toBeDefined();
                expect(res instanceof Array).toBeTruthy();
                expect(res.length).toEqual(1);
                done();
            });
        });

        describe(': student object', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.findAll(mockData.getMongooseModel(student)).then(x => {
                        res = x;
                        done();
                    });
                }, 500);
            });

            it(': exists', (done) => {
                expect(res).toBeDefined();
                expect(res instanceof Array).toBeTruthy();
                expect(res.length).toEqual(1);
                done();
            });
        });

        afterAll(() => {
            mockData.clearDatabase();
        });
    });

    //Anuj- need to fix this unit test with latest changes for bulk post
    xdescribe(': mongoose functions', () => {
        describe(': bulk post', () => {
            var objs = [];
            objs.push({ 'name': 'student1' });
            objs.push({ 'name': 'student2' });

            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.bulkPost(mockData.getMongooseModel(student), objs).then(x => {
                        res = x;
                        done();
                    });
                }, 500);
            });

            it(': test', (done) => {
                console.log('bulk post res:', res);
                expect(res).toBeDefined();
                expect(res instanceof Array).toBeTruthy();
                expect(res.length).toEqual(2);
                done();
            });

            afterAll(() => {
                mockData.clearDatabase();
            });
        });

        //Anuj- need to fix this unit test with latest changes for bulk put
        xdescribe(': bulk put', () => {
            var objs = [];
            objs.push({ 'name': 'student1' });
            objs.push({ 'name': 'student2' });

            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.bulkPost(mockData.getMongooseModel(student), objs).then(x => {
                        x[0]['name'] = 'student3';
                        x[1]['name'] = 'student4';
                        MongooseModel.bulkPut(mockData.getMongooseModel(student), x).then(x => {
                            res = x;
                            done();
                        });
                    });
                }, 500);
            });

            it(': test', (done) => {
                console.log('bulk put res:', res);
                expect(res).toBeDefined();
                expect(res instanceof Array).toBeTruthy();
                expect(res.length).toEqual(2);
                expect((res[0]['name'] == 'student3') || (res[0]['name'] == 'student4')).toBeTruthy();
                done();
            });

            afterAll(() => {
                mockData.clearDatabase();
            });
        });

        describe(': findByField', () => {
            var objs = [];
            objs.push({ 'name': 'student1' });
            objs.push({ 'name': 'student2' });

            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.bulkPost(mockData.getMongooseModel(student), objs).then(x => {
                        MongooseModel.findByField(mockData.getMongooseModel(student), 'name', 'student1').then(x => {
                            res = x;
                            done();
                        });
                    });
                }, 500);
            });

            it(': test', (done) => {
                console.log('findByField res:', res);
                expect(res).toBeDefined();
                expect(res['name'] == 'student1').toBeTruthy();
                done();
            });

            afterAll(() => {
                mockData.clearDatabase();
            });
        });

        describe(': findChild', () => {
            var objs = [];
            objs.push({ 'name': 'student1' });
            objs.push({ 'name': 'student2' });

            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.bulkPost(mockData.getMongooseModel(student), objs).then(x => {
                        MongooseModel.findChild(mockData.getMongooseModel(student), x[0]['_id'], 'name').then(x => {
                            res = x;
                            done();
                        });
                    });
                }, 500);
            });

            it(': test', (done) => {
                console.log('findChild res:', res);
                expect(res).toBeDefined();
                expect(res == 'student1').toBeTruthy();
                done();
            });

            afterAll(() => {
                mockData.clearDatabase();
            });
        });

        xdescribe(': findWhere', () => {
            var objs = [];
            objs.push({ 'name': 'student1' });
            objs.push({ 'name': 'student2' });

            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.bulkPost(mockData.getMongooseModel(student), objs).then(x => {
                        var con = {};
                        con['name'] = 'student1';
                        MongooseModel.findWhere(mockData.getMongooseModel(student), con).then(x => {
                            res = x;
                            done();
                        });
                    });
                }, 500);
            });

            it(': test', (done) => {
                console.log('findWhere res:', res);
                expect(res).toBeDefined();
                expect(res['name'] == 'student1').toBeTruthy();
                done();
            });

            afterAll(() => {
                mockData.clearDatabase();
            });
        });

        describe(': patch', () => {
            var objs = [];
            objs.push({ 'name': 'student1' });
            objs.push({ 'name': 'student2' });

            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.bulkPost(mockData.getMongooseModel(student), objs).then(x => {
                        x[0]['name'] = 'student3';
                        MongooseModel.patch(mockData.getMongooseModel(student), x[0]['_id'], x[0]).then(x => {
                            res = x;
                            done();
                        });
                    });
                }, 500);
            });

            it(': test', (done) => {
                console.log('patch res:', res);
                expect(res).toBeDefined();
                expect(res['name'] == 'student3').toBeTruthy();
                done();
            });

            afterAll(() => {
                mockData.clearDatabase();
            });
        });

        describe(': post embedded one object', () => {
            var stud1 = {};
            var resStud1, resStud2, resSub1;
            var sub1 = {};

            beforeAll(() => {
                stud1['name'] = 'student1';
                sub1['name'] = 'subject1';
                stud1['courseOTO'] = sub1;
                resSub1 = mockData.createMongooseModel(course, { 'name':'subject1'});
            });

            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.post(mockData.getMongooseModel(student), stud1).then(x => {
                        resStud1 = x;

                        sub1 = {};
                        sub1['_id'] = resSub1['_id'];
                        stud1['courseOTO'] = sub1;
                        MongooseModel.post(mockData.getMongooseModel(student), stud1).then(x => {
                            resStud2 = x;
                            done();
                        });
                    });
                }, 500);
            });

            it(': test', (done) => {
                console.log('embed 1 object stud1, stud2', resStud1, resStud2);
                expect(resStud1).toBeDefined();
                expect(resStud2).toBeDefined();
                done();
            });

            afterAll(() => {
                mockData.clearDatabase();
            });
        });
    });

    describe(': student-course (one to one)(Embedded = true)', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
            console.log('#### started - (one to one)(Embedded = true)');
        });

        describe(': add', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseOTO': sub1['_id'] })
                        .then(x => {
                            res = x;
                            done();
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('add res:', res);
                expect(res).toBeDefined();
                expect(res['courseOTO']).toBeDefined();
                expect(res['courseOTO']['_id']).toEqual(sub1['_id']);
                done();
            });
        });

        describe(': update', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseOTO': sub1['_id'] })
                        .then(stud => {

                            // set condition to update database
                            var cond = {};

                            cond['courseOTO._id'] = sub1['_id'];
                            stud['courseOTO']['name'] = 'subject3';
                            mockData.MongoDbMock.setOnUpdate(student, cond, stud);

                            MongooseModel.put(mockData.getMongooseModel(course), sub1['_id'], { 'name': 'subject3' })
                                .then(cor => {
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('update res:', res);
                expect(res).toBeDefined();
                expect(res['courseOTO']).toBeDefined();
                expect(res['courseOTO']['_id']).toEqual(sub1['_id']);
                expect(res['courseOTO']['name']).toEqual('subject3');
                done();
            });
        });

        describe(': delete', () => {
            var del;
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseOTO': sub1['_id'] })
                        .then(stud => {

                            // set condition to update database
                            var cond = {};
                            cond['courseOTO._id'] = sub1['_id'];
                            stud['courseOTO'] = null;
                            mockData.MongoDbMock.setOnUpdate(student, cond, stud);
                            MongooseModel.del(mockData.getMongooseModel(course), sub1['_id'])
                                .then(cor => {
                                    del = cor;
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('delete del:', del, ' res:', res);
                expect(res).toBeDefined();
                expect(res['courseOTO']).toBeNull();
                expect(del.delete).toEqual('success');
                done();
            });
        });

        afterAll(() => {
            mockData.clearDatabase();
            console.log('#### completed - (one to one)(Embedded = true)');
        });
    });

    describe(': student-course (one to one)(Embedded = false)', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
            console.log('#### started - (one to one)(Embedded = false)');
        });

        describe(': add', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseIdOTO': sub1['_id'] })
                        .then(x => {
                            res = x;
                            done();
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('add res:', res);
                expect(res).toBeDefined();
                expect(res['courseIdOTO']).toEqual(sub1['_id']);
                done();
            });
        });

        describe(': update', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseIdOTO': sub1['_id'] })
                        .then(stud => {

                            // set condition to update database (This condition should not hit)
                            var cond = {};
                            cond['courseIdOTO'] = sub1['_id'];
                            stud['courseIdOTO']['name'] = 'subject3';
                            mockData.MongoDbMock.setOnUpdate(student, cond, stud);

                            MongooseModel.put(mockData.getMongooseModel(course), sub1['_id'], { 'name': 'subject3' })
                                .then(cor => {
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('update res:', res);
                expect(res).toBeDefined();
                expect(res['courseIdOTO']).toEqual(sub1['_id']);
                done();
            });
        });

        describe(': delete', () => {
            var del;
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseIdOTO': sub1['_id'] })
                        .then(stud => {

                            // set condition to update database
                            var cond = {};
                            cond['courseIdOTO'] = sub1['_id'];
                            student1['_doc']['courseIdOTO'] = null;
                            mockData.MongoDbMock.setOnUpdate(student, cond, student1['_doc']);

                            MongooseModel.del(mockData.getMongooseModel(course), sub1['_id'])
                                .then(cor => {
                                    del = cor;
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('delete del:', del, ' res:', res);
                expect(res).toBeDefined();
                expect(res['courseIdOTO']).toBeNull();
                expect(del.delete).toEqual('success');
                done();
            });
        });

        afterAll(() => {
            mockData.clearDatabase();
            console.log('#### completed - (one to one)(Embedded = false)');
        });
    });

    describe(': student-course (one to many)(Embedded = true)', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            sub2 = mockData.createMongooseModel(course, { 'name': 'subject2' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
            console.log('#### started - (one to many)(Embedded = true)');
        });

        describe(': add', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseOTM': [sub1['_id'], sub2['_id']] })
                        .then(x => {
                            res = x;
                            done();
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('add res:', res);
                expect(res).toBeDefined();
                expect(res['courseOTM']).toBeDefined();
                expect(res['courseOTM'] instanceof Array).toBeTruthy();
                var courses = res['courseOTM'];
                expect(courses.length).toEqual(2);
                expect(courses[0]['_id'] == sub1['_id'].toString() || courses[0]['_id'] == sub2['_id'].toString()).toBeTruthy();
                done();
            });
        });

        describe(': update', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseOTM': [sub1['_id'], sub2['_id']] })
                        .then(stud => {

                            // set condition to update database
                            var cond = {};
                            cond['courseOTM._id'] = sub1['_id'];
                            var sub = stud['courseOTM'].find(x => x['_id'] == sub1['_id'].toString());
                            sub['name'] = 'subject3';
                            mockData.MongoDbMock.setOnUpdate(student, cond, stud);

                            MongooseModel.put(mockData.getMongooseModel(course), sub1['_id'], { 'name': 'subject3' })
                                .then(cor => {
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('update res:', res);
                expect(res).toBeDefined();
                expect(res['courseOTM'] instanceof Array).toBeTruthy();
                var courses = res['courseOTM'];
                expect(courses.length).toEqual(2);
                expect(courses[0]['_id'] == sub1['_id'].toString() || courses[0]['_id'] == sub2['_id'].toString()).toBeTruthy();
                expect(courses.find(x => x['_id'] == sub1['_id'].toString())['name']).toEqual('subject3');
                done();
            });
        });

        describe(': delete', () => {
            var del;
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseOTM': [sub1['_id'], sub2['_id']] })
                        .then(stud => {

                            // set condition to update database
                            var cond = {};
                            cond['$pull'] = {};
                            cond['$pull']['courseOTM']={};
                            cond['$pull']['courseOTM']['_id'] = sub1['_id'];
                            stud['courseOTM'] = [sub2['_doc']];
                            mockData.MongoDbMock.setOnUpdate(student, cond, stud);

                            MongooseModel.del(mockData.getMongooseModel(course), sub1['_id'])
                                .then(cor => {
                                    del = cor;
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('delete del:', del, ' res:', res);
                expect(res).toBeDefined();
                var courses = res['courseOTM'];
                expect(courses.length).toEqual(1);
                expect(courses[0]['_id'] == sub2['_id'].toString()).toBeTruthy();
                expect(del.delete).toEqual('success');
                done();
            });
        });

        afterAll(() => {
            mockData.clearDatabase();
            console.log('#### completed - (one to many)(Embedded = true)');
        });
    });

    describe(': student-course (one to many)(Embedded = false)', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            sub2 = mockData.createMongooseModel(course, { 'name': 'subject2' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
            console.log('#### started - (one to many)(Embedded = false)');
        });

        describe(': add', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseIdOTM': [sub1['_id'], sub2['_id']] })
                        .then(x => {
                            res = x;
                            done();
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('add res:', res);
                expect(res).toBeDefined();
                expect(res['courseIdOTM']).toBeDefined();
                expect(res['courseIdOTM'] instanceof Array).toBeTruthy();
                var courses = res['courseIdOTM'];
                expect(courses.length).toEqual(2);
                expect(courses[0] == sub1['_id'].toString() || courses[0] == sub2['_id'].toString()).toBeTruthy();
                done();
            });
        });

        describe(': update', () => {
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseIdOTM': [sub1['_id'], sub2['_id']] })
                        .then(stud => {

                            // set condition to update database (This condition should not hit)
                            var cond = {};
                            cond['courseIdOTM._id'] = sub1['_id'];
                            stud['courseIdOTM']['_id'] = sub1['_id'];
                            mockData.MongoDbMock.setOnUpdate(student, {}, stud);

                            MongooseModel.put(mockData.getMongooseModel(course), sub1['_id'], { 'name': 'subject3' })
                                .then(cor => {
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('update res:', res);
                expect(res).toBeDefined();
                expect(res['courseIdOTM'] instanceof Array).toBeTruthy();
                var courses = res['courseIdOTM'];
                expect(courses.length).toEqual(2);
                expect(courses[0] == sub1['_id'].toString() || courses[0] == sub2['_id'].toString()).toBeTruthy();
                done();
            });
        });

        describe(': delete', () => {
            var del;
            beforeEach((done) => {
                setTimeout(function () {
                    MongooseModel.put(mockData.getMongooseModel(student), student1['_id'], { 'courseIdOTM': [sub1['_id'], sub2['_id']] })
                        .then(stud => {

                            // set condition to update database
                            var cond = {};
                            cond['$pull'] = {};
                            cond['$pull']['courseIdOTM'] = sub1['_id'];
                            stud['courseIdOTM'] = [sub2['_id']];
                            mockData.MongoDbMock.setOnUpdate(student, cond, stud);

                            MongooseModel.del(mockData.getMongooseModel(course), sub1['_id'])
                                .then(cor => {
                                    del = cor;
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': test', (done) => {
                console.log('delete del:', del, ' res:', res);
                expect(res).toBeDefined();
                var courses = res['courseIdOTM'];
                expect(courses.length).toEqual(1);
                expect(courses[0] == sub2['_id'].toString()).toBeTruthy();
                expect(del.delete).toEqual('success');
                done();
            });
        });

        afterAll(() => {
            mockData.clearDatabase();
            console.log('#### completed - (one to many)(Embedded = false)');
        });
    });

    //Anuj- need to fix this unit test with latest changes for bulk post
    xdescribe(': student-course (many to many)(deleteCascade = true)', () => {
        var student1;
        var objs = [], student1;
        beforeAll(() => {
            student1 = {};
            student1['name'] = 'student1';
            objs.push({ 'name': 'subject1' });
            objs.push({ 'name': 'subject2' });
        });

        beforeEach((done) => {
            setTimeout(function () {
                MongooseModel.bulkPost(mockData.getMongooseModel(course), objs).then(x => {
                    var courseDelCascase = Enumerable.from(x).select(a => a['_id']).toArray();
                    student1['courseDelCascase'] = courseDelCascase;
                    MongooseModel.post(mockData.getMongooseModel(student), student1).then(x => {
                        MongooseModel.del(mockData.getMongooseModel(student), student1['_id']).then(x => {
                            MongooseModel.findAll(mockData.getMongooseModel(course)).then(x => {
                                res = x;
                                done(); 
                            });
                        });
                    });
                });
            }, 500);
        });
        
        it(': test', (done) => {
            done();
        });
    });

    afterAll(() => {
        mockData.clearDatabase();
        console.log('#### completed - (one to many)(Embedded = false)');
    });
});
