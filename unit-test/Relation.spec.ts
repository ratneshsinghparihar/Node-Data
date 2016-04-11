/// <reference path="../mongoose/mongoose-model.ts" />
import * as MongooseModel from '../mongoose/mongoose-model';
import * as Utils from "../mongoose/utils";
import * as modeEntity from '../core/dynamic/model-entity';
import * as mockData from './MockDataForRelation'
import {course} from './models/course';
import {student} from './models/student';
import {teacher} from './models/teacher';

import Mongoose = require("mongoose");
var Enumerable: linqjs.EnumerableStatic = require('linq');
var Q = require('q');

describe('testing relation', () => {
    var mock: mockData.mockedFunctions = new mockData.mockedFunctions();
    var sub1, sub2, student1, student2, res;

    beforeAll(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

        spyOn(Utils, 'castToMongooseType').and.callFake(mock.castToMongooseType);
        spyOn(modeEntity, 'getEntity').and.callFake(mock.getEntity);
        spyOn(modeEntity, 'getModel').and.callFake(mock.getModel);
        mockData.AddAllFakeFunctions();
        spyOn(Q, 'nbind').and.callFake((func, model) => mockData.getFakeFunctionForMongoose(func, model));

        console.log('initialized successfully');
    });

    xdescribe(': fake objects', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            sub2 = mockData.createMongooseModel(course, { 'name': 'subject2' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
            student2 = mockData.createMongooseModel(student, { 'name': 'student2' });
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
                console.log(res);
                expect(res).toBeDefined();
                expect(res instanceof Array).toBeTruthy();
                expect(res.length).toEqual(2);
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
                console.log(res);
                expect(res).toBeDefined();
                expect(res instanceof Array).toBeTruthy();
                expect(res.length).toEqual(2);
                done();
            });
        });

        afterAll(() => {
            mockData.clearDatabase();
        });
    });

    xdescribe(': student-course (one to one)(Embedded = true)', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            sub2 = mockData.createMongooseModel(course, { 'name': 'subject2' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
            student2 = mockData.createMongooseModel(student, { 'name': 'student2' });
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

            it(': exists', (done) => {
                console.log(res);
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
                                    console.log('find one');
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': exists', (done) => {
                console.log('res:',res);
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

            it(': exists', (done) => {
                console.log('del, res:', del, res);
                expect(res).toBeDefined();
                expect(res['courseOTO']).toBeNull();
                expect(del.delete).toEqual('success');
                done();
            });
        });

        afterAll(() => {
            mockData.clearDatabase();
        });
    });

    xdescribe(': student-course (one to one)(Embedded = false)', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            sub2 = mockData.createMongooseModel(course, { 'name': 'subject2' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
            student2 = mockData.createMongooseModel(student, { 'name': 'student2' });
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

            it(': exists', (done) => {
                console.log('res: ', res);
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
                                    console.log('find one');
                                    MongooseModel.findOne(mockData.getMongooseModel(student), student1['_id'])
                                        .then(x => {
                                            res = x;
                                            done();
                                        });
                                });
                        });
                }, 500);
            });

            it(': exists', (done) => {
                console.log('res:', res);
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

            it(': exists', (done) => {
                console.log('del, res:', del, res);
                expect(res).toBeDefined();
                expect(res['courseIdOTO']).toBeNull();
                expect(del.delete).toEqual('success');
                done();
            });
        });

        afterAll(() => {
            mockData.clearDatabase();
        });
    });

    xdescribe(': student-course (one to many)(Embedded = true)', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            sub2 = mockData.createMongooseModel(course, { 'name': 'subject2' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
            console.log('started - (one to many)(Embedded = true) with following data');
            console.log(sub1, sub2, student1);
        });

        describe(': add', () => {
            beforeEach((done) => {
                console.log('first');
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
            console.log('second');
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
            console.log('completed - (one to many)(Embedded = true)');
        });
    });

    xdescribe(': student-course (one to many)(Embedded = false)', () => {
        beforeAll(() => {
            // create fake objects
            sub1 = mockData.createMongooseModel(course, { 'name': 'subject1' });
            sub2 = mockData.createMongooseModel(course, { 'name': 'subject2' });
            student1 = mockData.createMongooseModel(student, { 'name': 'student1' });
            console.log('started - (one to many)(Embedded = false) with following data');
            console.log(sub1, sub2, student1);
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
            console.log('completed - (one to many)(Embedded = false)');
        });
    });
});
