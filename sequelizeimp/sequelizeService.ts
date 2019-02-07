import {config} from '../core/utils';
import * as Sequelize from "sequelize";
import Q = require('q');
import {IEntityService} from '../core/interfaces/entity-service';
import {MetaUtils} from "../core/metadata/utils";
import {pathRepoMap, getEntity} from '../core/dynamic/model-entity';
import {QueryOptions} from '../core/interfaces/queryOptions';
import {Decorators as CoreDecorators, Decorators} from '../core/constants';
//import {pathRepoMap} from './schema';
import * as schema  from "./schema";
import * as Enumerable from 'linq';
import { MetaData } from '../core/metadata/metadata';
import { IAssociationParams } from '../core/decorators/interfaces';

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


    getCustomResult(databaseName: string, query) {
        if (config().SqlConfig.isSqlEnabled == false)
            return;
        var dynamicSequelize = new Sequelize(databaseName,
            config().SqlConfig.username,
            config().SqlConfig.password,
            config().SqlConfig.sequlizeSetting);
        return dynamicSequelize.query(query);   
    }

    addScheam(name: string, schema: any, detail: any) {
        var newSchema = this.sequelize.define(name, schema, detail);
        this._schemaCollection[name] = newSchema;
        return newSchema;
    }

    addRelationInSchema(fromSchema: any, toSchema: any, relationType:string, metaData:IAssociationParams) {
        let path = metaData.propertyKey;
        if (relationType == CoreDecorators.ONETOMANY)
            fromSchema.hasMany(toSchema, { as: path});
        if (relationType == CoreDecorators.MANYTOONE)
            fromSchema.belongsTo(toSchema, { as: path, foreignKey:metaData.foreignKey});
        if (relationType == CoreDecorators.ONETOONE)
            fromSchema.has(toSchema, { as: path});

        let relationToDictionary: any = {};
        relationToDictionary.metaData = metaData;
        relationToDictionary.type = relationType;
        relationToDictionary["relation"] = metaData.rel;
        relationToDictionary.fromSchema = fromSchema;
        relationToDictionary.toSchema = toSchema;
        relationToDictionary.path = path;

        this._relationCollection.push(relationToDictionary);
    }

    getModel(repoPath: string, dynamicName?: string) {
        try {
            var schemaNamefromPathRepomap = pathRepoMap[repoPath].schemaName;
            return this._schemaCollection[schemaNamefromPathRepomap];
        } catch (e) {
            throw e;
        }
    }

    bulkPost(repoPath: string, objArr: Array<any>, batchSize?: number): Q.Promise<any> {
        return this.getModel(repoPath).bulkCreate(objArr, batchSize);
    }

    bulkPutMany(repoPath: string, objIds: Array<any>, obj: any): Q.Promise<any> {
        return null;
    }

    bulkDel(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return this.getModel(repoPath).destroy({ where: { id: objArr } });
    }

    bulkPut(repoPath: string, objArr: Array<any>,batchSize?: number): Q.Promise<any> {
        let asyncalls=[];
        objArr.forEach(obj=>{
            asyncalls.push(this.getModel(repoPath).update(obj, { where: { id: obj.id } }));
        });
        return Q.allSettled(asyncalls);
    }

    

    bulkPatch(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return this.getModel(repoPath).bulkUpdate(objArr);
    }

    findAll(repoPath: string): Q.Promise<any> {
        return this.getModel(repoPath).findAll({raw: true}).then(result => {
            if (!result) return null;
            //var finalOutput = Enumerable.from(result).select((x:any) => x.dataValues).toArray();// result.forEach(x => x.dataValues).toArray();
            return result;
        });
    }

    findWhere(repoPath: string, query, selectedFields?: Array<string>, queryOptions?: QueryOptions, toLoadChilds?: boolean): Q.Promise<any> {
        let schemaModel = this.getModel(repoPath)
        let cond = {where: query}
        if(selectedFields && selectedFields.length>0){
            cond['attributes'] = selectedFields
        }
        cond['include'] = this.getAllForeignKeyAssocations(schemaModel, selectedFields);
        return schemaModel.findAll(cond).then(result => {
            if (!result) return null;
            return result.map(x=>x.dataValues);
        });
    }

    //This is not testest yet
    //TODO: add test case for this
    countWhere(repoPath: string, query): Q.Promise<any> {
        return this.getModel(repoPath).findAndCountAll({ where: query }).then(result => {
            return result;
        });
    }
    

    //This is not testest yet
    //TODO: add test case for this
    distinctWhere(repoPath: string, query): Q.Promise<any> {
        if (!query) {
            query = {};
        }
        query.distinct = true;
        return this.getModel(repoPath).findAndCountAll(query).then(result => {
            return result;
        });
    }

    getAllForeignKeyAssocations(schemaModel, properties:Array<string>){
        let includes = [];
        let relSchemas = this._relationCollection.filter(x=>(x.fromSchema.name == schemaModel.name) && (x.type == Decorators.MANYTOONE));
        if(relSchemas.length){
            relSchemas.forEach(x=>{
                if(!properties || !properties.length || properties.indexOf(x.path)>=0){
                    let model = {model:x.toSchema, as:x.path};
                    if(x.metaData.properties){
                        model['attributes'] = x.metaData.properties;
                    }
                    let childModel = this.getAllForeignKeyAssocations(x.toSchema, x.metaData.properties);
                    if(childModel.length){
                        model['include']= childModel;
                    }
                    includes.push(model);
                }
            });            
        }
        return includes;
    }

    findOne(repoPath: string, id): Q.Promise<any> {
        let schemaModel = this.getModel(repoPath);
        let primaryKey = schemaModel.primaryKeyAttribute;
        var cond = {};
        cond[primaryKey] = id;
        var self = this;
        let include = this.getAllForeignKeyAssocations(schemaModel, null);
        return schemaModel.find({ include: include, where: cond }).then(result => {
            return result.dataValues;
        }
        );
    }

    findByField(repoPath: string, fieldName, value): Q.Promise<any> {
        return this.getModel(repoPath).find({ where: { fieldName: value } });
    }

    findMany(repoPath: string, ids: Array<any>) {
        return this.findWhere(repoPath,{ id: ids });
    }

    findChild(repoPath: string, id, prop): Q.Promise<any> {
        return this.getModel(repoPath).find({
            where: { id: id },
            include: [
                { model: this.getModel(prop), as: prop }
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
        return this.getModel(repoPath).create(obj);
    }

    put(repoPath: string, id: any, obj: any): Q.Promise<any> {
        return this.getModel(repoPath).update(obj, { where: { id: id } });
    }

    del(repoPath: string, id: any): Q.Promise<any> {
        return this.getModel(repoPath).destroy({ where: { id: id } });
    }

    patch(repoPath: string, id: any, obj): Q.Promise<any> {
        return this.getModel(repoPath).update(obj, { where: { id: id } });
    }

    private getAssociationForSchema(model: any, schema: any) {
        Enumerable.from(this._relationCollection)
            .where(relationSchema => relationSchema.fromSchema == schema).forEach(relation1 => {
                model.dataValues[relation1.path] = model[relation1.toSchema.name + "s"];
            });
    }

}
export var sequelizeService = new SequelizeService();
//export var connect = sequelizeService.connect;
