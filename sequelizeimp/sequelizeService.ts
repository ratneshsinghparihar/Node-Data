/// <reference path="../config.ts" />
import {config} from '../core/utils';
import * as Sequelize from "sequelize";
import Q = require('q');
import {IEntityService} from '../core/interfaces/entity-service';
import {MetaUtils} from "../core/metadata/utils";
import {pathRepoMap} from '../core/dynamic/model-entity';

import {Decorators as CoreDecorators} from '../core/constants';
//import {pathRepoMap} from './schema';
import * as schema  from "./schema";
var Enumerable: linqjs.EnumerableStatic = require('linq');

class SequelizeService implements IEntityService {
    private sequelize: any;
    private _schemaCollection = {};
    private _relationCollection = [];
    constructor() {

    }

    init(force?: boolean): Promise<any> {
        force = force || false;
        return this.sequelize.sync({ force: force, logging: true });
    }

    connect() {
        if (config().SqlConfig.isSqlEnabled == false)
            return;
        this.sequelize = new Sequelize(config().SqlConfig.database,
            config().SqlConfig.username,
            config().SqlConfig.password,
            config().SqlConfig.sequlizeSetting);
    }

    getSqlContext(): any {
        return this.sequelize;
    }

    addScheam(name: string, schema: any, detail: any) {
        var newSchema = this.sequelize.define(name, schema, detail);
        this._schemaCollection[name] = newSchema;
        return newSchema;
    }

    addRelationInSchema(fromSchema: any, toSchema: any, relationType: string, relationName: string, path: string) {
        if (relationType == CoreDecorators.ONETOMANY)
            fromSchema.hasMany(toSchema, { as: path });
        if (relationType == CoreDecorators.MANYTOONE)
            fromSchema.belongsTo(toSchema, { as: path });
        if (relationType == CoreDecorators.ONETOONE)
            fromSchema.has(toSchema, { as: path });

        let relationToDictionary: any = {};
        relationToDictionary["relation"] = relationName;
        relationToDictionary.fromSchema = fromSchema;
        relationToDictionary.toSchema = toSchema;
        relationToDictionary.path = path;

        this._relationCollection.push(relationToDictionary);
    }

    private getSequelizeModel(repoPath: string) {
        try {
            var schemaNamefromPathRepomap = pathRepoMap[repoPath].schemaName;
            return this._schemaCollection[schemaNamefromPathRepomap];
        } catch (e) {
            throw e;
        }
    }

    bulkPost(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).bulkCreate(objArr);
    }

    bulkDel(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).destroy({ where: { id: objArr } });
    }

    bulkPut(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).bulkUpdate(objArr);
    }

    findAll(repoPath: string): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).findAll().then(result => {
            return result.dataValues;
        });
    }

    findWhere(repoPath: string, query): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).findAll(query).then(result => {
            return result.dataValues;
        });
    }

    findOne(repoPath: string, id): Q.Promise<any> {

        let schemaModel = this.getSequelizeModel(repoPath);
        let primaryKey = schemaModel.primaryKeyAttribute;
        var self = this;
        return schemaModel.find({ include: [{ all: true }], where: { id: id } }).then(result => {
            let model = result.dataValues;
            self.getAssociationForSchema(result, schemaModel);
            return result.dataValues;
        }
        );
    }

    findByField(repoPath: string, fieldName, value): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).find({ where: { fieldName: value } });
    }

    findMany(repoPath: string, ids: Array<any>) {
        return this.getSequelizeModel(repoPath).findAll({ where: { id: ids } });
    }

    findChild(repoPath: string, id, prop): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).find({
            where: { id: id },
            include: [
                { model: this.getSequelizeModel(prop), as: prop }
            ]
        }).then(
            function (entity) {
                return entity[prop];
            });
    }

    /**
     * case 1: all new - create main item and child separately and embed if true
     * case 2: some new, some update - create main item and update/create child accordingly and embed if true
     * @param obj
     */
    post(repoPath: string, obj: any): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).create(obj);
    }

    put(repoPath: string, id: any, obj: any): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).update(obj, { where: { id: id } });
    }

    del(repoPath: string, id: any): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).destroy({ where: { id: id } });
    }

    patch(repoPath: string, id: any, obj): Q.Promise<any> {
        return this.getSequelizeModel(repoPath).update(obj, { where: { id: id } });
    }

    private getAssociationForSchema(model: any, schema: any) {
        var asyncCalls = [];
        Enumerable.from(this._relationCollection)
            .where(relationSchema => relationSchema.fromSchema == schema).forEach(relation1 => {
                model.dataValues[relation1.path] = model[relation1.toSchema.name + "s"];
            });
        //return Q.allSettled(asyncCalls).then(res => {
        //    return model.dataValues;
        //});
    }

}
export var sequelizeService = new SequelizeService();
//export var connect = sequelizeService.connect;
