var Enumerable: any = require('linq');
import Mongoose = require("mongoose");
import {ClassType} from './classtype';
import {IEntityService} from '../interfaces/entity-service';
import {MetaData} from '../metadata/metadata';
import {MetaUtils} from '../metadata/utils';
import {Decorators, RelationDecorators} from '../constants';
import {IAssociationParams} from '../decorators/interfaces/association-params';

let _config: any = {};
let _entityService: IEntityService;

export function config(config?: any) {
    if (!(config === undefined)) {
        _config = config;
    }
    return _config;
}

export function entityService(entityService?: IEntityService): IEntityService {
    if (!(entityService === undefined)) {
        _entityService = entityService;
    }
    return _entityService;
}

export function getDesignType(target: Object|Function, prop: string) {
    return (<any>Reflect).getMetadata("design:type", target, prop);
}

export function getDesignParamType(target: Object | Function, prop: string, parameterIndex: number) {
    return (<any>Reflect).getMetadata("design:paramtypes", target, prop);
}


export function activator<T>(cls: ClassType<T>, args?: Array<any>): T {
    return new (Function.prototype.bind.apply(cls, [null].concat(args)));
    //function F(): void {
    //    return <any>cls.constructor.apply(this, args);
    //}
    //F.prototype = <any>cls.constructor.prototype;
    //return new F();
}

export function isRelationDecorator(decorator: string) {
    return decorator === Decorators.ONETOMANY || decorator === Decorators.MANYTOONE || decorator === Decorators.MANYTOMANY || decorator === Decorators.ONETOONE;
}


/**
 * Get all the metadata of all the decorators of all the models referencing current target, i.e. (rel = target relation name)
 * @param target like UserModel (function of prototype)
 * 
 */
export function getAllRelationsForTarget(target: Object): Array<MetaData> {
    if (!target) {
        throw TypeError;
    }
    //global.models.CourseModel.decorator.manytomany.students
    var name = getResourceNameFromModel(target);
    if (!name) {
        return null;
    }

    var metaForRelations = MetaUtils.getMetaDataForDecorators(RelationDecorators);

    return Enumerable.from(metaForRelations)
        .selectMany(keyVal => keyVal.metadata)
        .where(x => (<IAssociationParams>(<MetaData>x).params).rel === name)
        .toArray();
}

/**
 * Get all the metadata of all the decorators of all the models referencing current target, i.e. (rel = target relation name)
 * @param target like UserModel (function of prototype)
 *
 */
export function getAllRelationsForTargetInternal(target: Object): Array<MetaData> {
    if (!target) {
        throw TypeError;
    }
    //global.models.CourseModel.decorator.manytomany.students
    var meta = MetaUtils.getMetaData(target);

    if (!meta) {
        return null;
    }

    return Enumerable.from(meta)
        .where((x: any) => {
            return RelationDecorators.indexOf((<MetaData>x).decorator) !== -1;
        })
        .toArray();
}

//@document({ name: 'blogs', isStrict: false })
//export class BlogModel
//this will return 'blogs' 
export function getResourceNameFromModel(object: Object): string {
    var meta = MetaUtils.getMetaData(object, Decorators.DOCUMENT);
    
    if (!meta || !meta[0] || !meta[0].params) {
        return null;
    }
    return meta[0].params.name;
}

//@document({ name: 'blogs', isStrict: false })
//export class BlogModel
//this will return 'blogs' 
//if calling from repo w/o object you will atleast know the name of all resources
export function getAllResourceNames(): Array<string> {
    var resources = [];

    var meta = MetaUtils.getMetaDataForDecorators([Decorators.REPOSITORY]);

    return Enumerable.from(meta)
        .select(x => {
            return (<MetaData>x.metadata[0]).params.path;
        })
        .toArray();
}

export function getPrimaryKeyMetadata(target: Object) {
    var meta = MetaUtils.getMetaData(target, Decorators.FIELD);
    return Enumerable.from(meta)
        .where(keyval => keyval.params.primary) // keyval = {[key(propName): string]: Metadata};
        .select(keyVal => keyVal)
        .firstOrDefault();
}

//export function getAllRelationalMetaDataForField(target: Object, propertyKey?: string): Array<MetaData> {
//    if (!target) {
//        throw TypeError;
//    }

//    propertyKey = propertyKey || CLASSDECORATOR_PROPKEY;

//    var metaKey = MetadataHelper.getMetaKey(target);
//    if (!metadataRoot.get(metaKey)) {
//        return null;
//    }

//    return Enumerable.from(metadataRoot.get(metaKey))
//        .where((keyVal: any) => Utils.isRelationDecorator(keyVal.key))
//        .selectMany(keyval => keyval.value) // keyval = {[key(decoratorName): string]: {[key(propName)]: Metadata}};
//        .where(keyVal => keyVal.key === propertyKey) // keyval = {[key(propName): string]: Metadata};
//        .select(keyVal => keyVal.value) // keyval = {[key(propName): string]: Metadata};
//        .toArray();
//}

//var authenticateByToken = expressJwt({
//    secret: SecurityConfig.SecurityConfig.tokenSecretkey,
//    credentialsRequired: true,
//    getToken: function fromHeaderOrQuerystring(req) {
//        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
//            return req.headers.authorization.split(' ')[1];
//        } else if (req.query && req.query.token) {
//            return req.query.token;
//        } else if (req.cookies && req.cookies.authorization) {
//            return req.cookies.authorization;
//        }
//        return null;
//    }
//});

//export function ensureLoggedIn() {
//    if (Config.Security.isAutheticationEnabled == SecurityConfig.AuthenticationEnabled[SecurityConfig.AuthenticationEnabled.disabled]) {
//        return function (req, res, next) {
//            next();
//        }
//    }

//    //by token
//    if (Config.Security.authenticationType == SecurityConfig.AuthenticationType[SecurityConfig.AuthenticationType.TokenBased]) {
//        return authenticateByToken;
//    }

//    //by password
//    if (Config.Security.authenticationType == SecurityConfig.AuthenticationType[SecurityConfig.AuthenticationType.passwordBased]) {
//        return loggedIn();
//    }

//    return function (req, res, next) {
//        next();
//    }
//}
