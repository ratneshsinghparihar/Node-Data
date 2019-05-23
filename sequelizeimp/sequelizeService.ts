import {config,isJSON} from '../core/utils';
import * as Sequelize from "sequelize";
import Q = require('q');
import {IEntityService} from '../core/interfaces/entity-service';
import {MetaUtils} from "../core/metadata/utils";
import {pathRepoMap, getEntity} from '../core/dynamic/model-entity';
import {QueryOptions} from '../core/interfaces/queryOptions';
import {Decorators as CoreDecorators, Decorators} from '../core/constants';
import * as Enumerable from 'linq';
import { IAssociationParams } from '../core/decorators/interfaces';
import { PrincipalContext } from '../security/auth/principalContext';
import {ConstantKeys} from '../core/constants/constantKeys';

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

    startTransaction(param?:any):Q.Promise<any>{
        return this.sequelize.transaction();
    }

    commitTransaction(param?:any):Q.Promise<any>{
        return param.commit();
    }

    rollbackTransaction(param?:any):Q.Promise<any>{
        return param.rollback();
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
            fromSchema.hasMany(toSchema, { as: path, foreignKey:metaData.foreignKey});
        if (relationType == CoreDecorators.MANYTOONE)
            fromSchema.belongsTo(toSchema, { as: path, foreignKey:metaData.foreignKey});
        if (relationType == CoreDecorators.ONETOONE)
            fromSchema.hasOne(toSchema, { as: path, foreignKey:metaData.foreignKey});

        let relationToDictionary: any = {};
        relationToDictionary.metaData = metaData;
        relationToDictionary.type = relationType;
        relationToDictionary["relation"] = metaData.rel;
        relationToDictionary.fromSchema = fromSchema;
        relationToDictionary.toSchema = toSchema;
        relationToDictionary.path = path;

        this._relationCollection.push(relationToDictionary);
    }

    parseProperties(props,schemaModel){
        let config = {}
        props.forEach(prop=>{
            if(prop.indexOf('.')<0){
                config['attributes']=config['attributes']?config['attributes']:[];
                config['attributes'].push(prop);
            }
            else{
                let foreignKeys = prop.split('.');
                this.insertForeignKey(config, foreignKeys,schemaModel);
            }
        })
        return config;
    }

    insertForeignKey(config, foreignKeys,schemaModel){
        let modelConfig = config;
        foreignKeys.forEach((x, i)=>{
            if(foreignKeys.length-1 == i){
                modelConfig['attributes']=modelConfig['attributes']?modelConfig['attributes']:[];
                let relSchemas = this._relationCollection.filter(schema => (schema.relation == schemaModel.name));
                if(relSchemas.length >0 && relSchemas[0].toSchema.primaryKeyAttribute!=x){
                    modelConfig['attributes'].push(x);
                }
            }
            else{
                modelConfig['include']=modelConfig['include']?modelConfig['include']:[];
                let filterConfig = modelConfig.include.filter(p=>p.as==x);
                if(!filterConfig.length){
                    let relSchemas = this._relationCollection.filter(schema => (schema.fromSchema.name == schemaModel.name) && (schema.type == Decorators.MANYTOONE) && (schema.path == x));
                    if(relSchemas.length>0){
                    schemaModel = relSchemas[0].toSchema;
                    let tempConfig = { model: relSchemas[0].toSchema, as :relSchemas[0].path,attributes:[relSchemas[0].toSchema.primaryKeyAttribute]}
                    modelConfig.include.push(tempConfig);
                    modelConfig = tempConfig;
                    }
                }
                else{
                    let relSchemas = this._relationCollection.filter(schema => (schema.fromSchema.name == schemaModel.name) && (schema.type == Decorators.MANYTOONE) && (schema.path == x));
                    if(relSchemas.length>0){
                    schemaModel = relSchemas[0].toSchema;
                    }
                    modelConfig = filterConfig[0];
                }
            }
        })
    }

    getAllForeignKeyAssocationsForFindWhere(inputArr, schemaModel) {
        let parseProperties = this.parseProperties(inputArr,schemaModel);
        return parseProperties;
    }

    getAllForeignKeyAssocations(schemaModel, properties:Array<string>){
        let includes = [];
        let relSchemas = this._relationCollection.filter(x=>(x.fromSchema.name == schemaModel.name) && (x.type == Decorators.MANYTOONE ));
        if(relSchemas.length){
            relSchemas.forEach(x=>{
                if(!properties || !properties.length || properties.indexOf(x.path)>=0){
                    if(x.metaData.eagerLoading){
                        let model = { model: x.toSchema, as: x.path};
                        if (x.metaData.properties) {
                            model['attributes'] = x.metaData.properties;
                        }
                        let childModel = this.getAllForeignKeyAssocations(x.toSchema, x.metaData.properties);
                        if(childModel.length){
                            model['include']= childModel;
                        }
                        includes.push(model);
                    }
                }
            });            
        }
        return includes;
    }

    getAllForeignKeyAssocationsForManyToOne(schemaModel, properties:Array<string>){
        let includes = [];
        let relSchemas = this._relationCollection.filter(x=>(x.fromSchema.name == schemaModel.name) && (x.type == Decorators.MANYTOONE));
        if(relSchemas.length){
            relSchemas.forEach(x=>{
                if(!properties || !properties.length || properties.indexOf(x.path)>=0){
                    if(x.metaData.eagerLoading){
                        let model = { model: x.toSchema, as: x.path};
                        if (x.metaData.properties) {
                            model['attributes'] = x.metaData.properties;
                        }
                        let childModel = this.getAllForeignKeyAssocationsForManyToOne(x.toSchema, x.metaData.properties);
                        if(childModel.length){
                            model['include']= childModel;
                        }
                        includes.push(model);
                    }
                }
            });            
        }
        return includes;
    }

    getAllForeignKeyAssocationsOneToMany(type, schemaModel, properties:Array<string>){
        let includes = [];
        let relSchemas = this._relationCollection.filter(x=>(x.fromSchema.name == schemaModel.name) && ( x.type == type));
        if(relSchemas.length){
            relSchemas.forEach(x=>{
                if(!properties || !properties.length || properties.indexOf(x.path)>=0){
                    if(x.metaData.eagerLoading){
                        let model = { model: x.toSchema, as: x.path};
                        if (x.metaData.properties) {
                            model['attributes'] = x.metaData.properties;
                        }
                        let childModel = this.getAllForeignKeyAssocationsOneToMany(type, x.toSchema, x.metaData.properties);
                        if(childModel.length){
                            model['include']= childModel;
                        }
                        includes.push(model);
                    }
                }
            });            
        }
        return includes;
    }

    getModel(repoPath: string, dynamicName?: string) {
        try {
            var schemaNamefromPathRepomap = pathRepoMap[repoPath].schemaName;
            return this._schemaCollection[schemaNamefromPathRepomap];
        } catch (e) {
            throw e;
        }
    }

    appendTransaction(options){
        let trans = PrincipalContext.get(ConstantKeys.transaction);
        if(trans){
            options['transaction'] = trans;
        }
        return options;
    }

    bulkPost(repoPath: string, objArr: Array<any>, batchSize?: number): Q.Promise<any> {
        let options = {individualHooks: true}
        options = this.appendTransaction(options);
        return this.getModel(repoPath).bulkCreate(objArr, options).then(result=>{
            return result.map(x=>x.dataValues);
        });
    }

    bulkPutMany(repoPath: string, objIds: Array<any>, obj: any): Q.Promise<any> {
        let primaryKey = this.getModel(repoPath).primaryKeyAttribute;
        let cond = {}
        cond[primaryKey] = objIds
        let options = { where: cond };
        options = this.appendTransaction(options);
        return this.getModel(repoPath).update(obj, options).then(result=>{
            return this.findMany(repoPath, objIds, false);
        });
    }

    bulkDel(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        let primaryKey = this.getModel(repoPath).primaryKeyAttribute;
        let cond = {}
        if(isJSON(objArr[0])){
            cond[primaryKey] = objArr.map(x => x[primaryKey]);
        }
        else{
            cond[primaryKey] = objArr;
        }
        let options = { where: cond }
        options = this.appendTransaction(options);
        return this.getModel(repoPath).destroy(options).then(result=>{
            return {success:result};
        })
    }

    bulkPut(repoPath: string, objArr: Array<any>,batchSize?: number): Q.Promise<any> {
        let asyncalls=[];
        let primaryKey = this.getModel(repoPath).primaryKeyAttribute;
        objArr.forEach(obj=>{
            let cond = {}
            cond[primaryKey] = obj[primaryKey];
            let options = { where: cond }
            options = this.appendTransaction(options);
            asyncalls.push(this.getModel(repoPath).update(obj, options));
        });
        return Q.allSettled(asyncalls).then(result=>{
            return this.findMany(repoPath, objArr.map(x=>x[primaryKey]), false);
        });
    }

    bulkPatch(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return this.bulkPut(repoPath, objArr);
    }

    findAll(repoPath: string): Q.Promise<any> {
        return this.getModel(repoPath).findAll({raw: true}).then(result => {
            if (!result) return null;
            //var finalOutput = Enumerable.from(result).select((x:any) => x.dataValues).toArray();// result.forEach(x => x.dataValues).toArray();
            return result;
        });
    }

    findWhere(repoPath: string, query, selectedFields?: Array<string>, queryOptions?: QueryOptions, toLoadChilds?: boolean): Q.Promise<any> {
        let schemaModel = this.getModel(repoPath);
        let cond = {};
        if (selectedFields && selectedFields.length > 0) {
             cond = this.getAllForeignKeyAssocationsForFindWhere(selectedFields, schemaModel);
        }
        else {
            cond['include'] = this.getAllForeignKeyAssocations(schemaModel, []);
        }
        cond["where"] = query
        if(queryOptions){
            if(queryOptions.skip){
                cond['offset'] = parseInt(queryOptions.skip.toString());
            }
            if(queryOptions.limit){
                cond['limit'] = parseInt(queryOptions.limit.toString());
            }
            if(queryOptions.sort){
                cond['order'] = queryOptions.sort
            }
        }
        return schemaModel.findAll(cond).then(result => {
            if (!result) return null;
            return result.map(x => x.dataValues);
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

    findOne(repoPath: string, id, donotLoadChilds?: boolean): Q.Promise<any> {
        let schemaModel = this.getModel(repoPath);
        let primaryKey = schemaModel.primaryKeyAttribute;
        var cond = {};
        cond[primaryKey] = id;
        let include1 = donotLoadChilds? [] : this.getAllForeignKeyAssocationsForManyToOne(schemaModel, null);
        let include2 = donotLoadChilds? [] : this.getAllForeignKeyAssocationsOneToMany(Decorators.ONETOMANY, schemaModel, null);
        let include3 = donotLoadChilds? [] : this.getAllForeignKeyAssocationsOneToMany(Decorators.ONETOONE, schemaModel, null);
        let include = include1.concat(include2).concat(include3);
        console.log('%%%%%%%%%%%%%%%%%%%%'+include);
        return schemaModel.find({ include: include, where: cond }).then(result => {
            return result.dataValues;
        })
        .catch(err=>{
            console.log('####'+err)
        })
    }

    findByField(repoPath: string, fieldName, value): Q.Promise<any> {
        return this.getModel(repoPath).find({ where: { fieldName: value } });
    }

    findMany(repoPath: string, ids: Array<any>, toLoadEmbeddedChilds?: boolean) {
        let primaryKey = this.getModel(repoPath).primaryKeyAttribute;
        let cond = {};
        cond[primaryKey] = ids;
        return this.findWhere(repoPath,cond, [], null, toLoadEmbeddedChilds);
    }

    findChild(repoPath: string, id, prop): Q.Promise<any> {
        let primaryKey = this.getModel(repoPath).primaryKeyAttribute;
        let cond = {};
        cond[primaryKey] = id;
        return this.getModel(repoPath).find({
            where: cond,
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
        let options = {};
        options = this.appendTransaction(options);
        return this.getModel(repoPath).create(obj, options);
    }

    put(repoPath: string, id: any, obj: any): Q.Promise<any> {
        let primaryKey = this.getModel(repoPath).primaryKeyAttribute;
        let cond = {};
        cond[primaryKey] = id;
        let options = { where: cond }
        options = this.appendTransaction(options);
        return this.getModel(repoPath).update(obj, options).then(result=>{
            return this.findOne(repoPath, id);
        })
    }

    del(repoPath: string, id: any): Q.Promise<any> {
        let primaryKey = this.getModel(repoPath).primaryKeyAttribute;
        let cond = {};
        cond[primaryKey] = id;
        let options = { where: cond };
        options = this.appendTransaction(options);
        return this.getModel(repoPath).destroy(options).then(result=>{
            return {success:result};
        })
    }

    patch(repoPath: string, id: any, obj): Q.Promise<any> {
        return this.put(repoPath, id, obj)
    }

    getSortCondition(val){
        return JSON.parse(val);
    }

    getLikeCondition(val){
        return {
            [this.sequelize.Op.like]: '%'+val+'%'
        }
    }

    getStartsWithCondition(val){
        return {
            [this.sequelize.Op.like]: val+'%'
        }
    }

    getPrimaryKey(repoPath){
        return this.getModel(repoPath).primaryKeyAttribute;
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
