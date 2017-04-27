import * as configUtil from '../utils';
import {winstonLog} from '../../logging/winstonLog';
import {IDynamicRepository, GetRepositoryForName} from './dynamic-repository';
var Reflect = require('reflect-metadata');
import {router} from '../exports';
var jwt = require('jsonwebtoken');
import {ISearchPropertyMap, GetAllFindBySearchFromPrototype} from "../metadata/searchUtils";
import {IActionPropertyMap, GetAllActionFromPrototype} from "../metadata/actionUtils";
import {MetaData} from '../metadata/metadata';
import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import {Decorators} from '../constants/decorators';
import {IAssociationParams, IPreauthorizeParams} from '../decorators/interfaces';
import {PreAuthService} from '../services/pre-auth-service';
import {RepoActions} from '../enums/repo-actions-enum';
import {PrincipalContext} from '../../security/auth/principalContext';
import {PostFilterService} from '../services/post-filter-service';
import {filterProps} from '../interfaces/queryOptions';
var multer = require('multer');

import * as securityImpl from './security-impl';
import * as Enumerable from 'linq';
var Q = require('q');
import {JsonIgnore} from '../enums/jsonignore-enum';

export class DynamicController {
    private repository: IDynamicRepository;
    private path: string;
    private entity: any;

    constructor(entity: any, repository: IDynamicRepository) {
        this.repository = repository;
        this.entity = entity;
        this.path = "/" + Utils.config().Config.basePath + "/" + entity.path;
        this.addSearchPaths();
        this.addActionPaths();
        this.addRoutes();
    }

    ensureLoggedIn(entity: any, action: any) {
        return function (req, res, next) {
            PrincipalContext.getSession().run(function () {
                var meta = MetaUtils.getMetaData(entity, Decorators.ALLOWANONYMOUS, action);
                if (meta) {
                    next();
                }
                else {
                    securityImpl.ensureLoggedIn()(req, res, next);
                }
            });
        }
    }

    isAuthorize(req, res, action: any) {
        var meta = MetaUtils.getMetaData(this.entity, Decorators.ALLOWANONYMOUS, action);
        if (meta) return true;
        if (securityImpl.isAuthorize(req, this.repository, action)) {
            PrincipalContext.save('req', req);
            PrincipalContext.save('res', res);
            return true;
        }
        return false;
    }

    addRoutes() {
        router.get(this.path,
            this.ensureLoggedIn(this.entity, RepoActions.findAll),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.findAll)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                return this.repository.findAll()
                    .then((result) => {
                        var resourceName = this.getFullBaseUrl(req);// + this.repository.modelName();
                        Enumerable.from(result).forEach((x:any) => {
                            x = this.getHalModel1(x, resourceName + "/" + x._id, req, this.repository);
                        });
                        //result = this.getHalModels(result,resourceName);
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        this.sendError(res, error);
                    });
            });

        router.get(this.path + '/:id',
            this.ensureLoggedIn(this.entity, RepoActions.findOne),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.findOne)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }
                return this.repository.findOne(req.params.id)
                    .then((result) => {
                        var resourceName = this.getFullBaseUrl(req);// + this.repository.modelName();
                        this.getHalModel1(result, resourceName, req, this.repository);
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        this.sendError(res, error);
                    });
            });

        router.get(this.path + '/:id/:prop',
            this.ensureLoggedIn(this.entity, RepoActions.findChild),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.findChild)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                return this.repository.findChild(req.params.id, req.params.prop)
                    .then((result) => {
                        var parentObj = {};
                        parentObj[req.params.prop] = result;
                        var resourceName = this.getFullBaseUrl(req);
                        this.getHalModel1(parentObj, resourceName + '/' + req.params.id, req, this.repository);
                        this.sendresult(req, res, parentObj[req.params.prop]);
                    }).catch(error => {
                        this.sendError(res, error);
                    });
            });

        router.post(this.path,
            this.ensureLoggedIn(this.entity, RepoActions.post),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.post)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                if (!Array.isArray(req.body)) {
                    this.getModelFromHalModel(req.body, req, res);
                    return this.repository.post(req.body)
                        .then((result) => {
                            var resourceName = this.getFullBaseUrlUsingRepo(req, this.repository.modelName());
                            this.getHalModel1(result, resourceName + '/' + result['_id'], req, this.repository);
                            this.sendresult(req, res, result);
                        }).catch(error => {
                            this.sendError(res, error);
                        });
                }
                else {
                    Enumerable.from(req.body).forEach(x => {
                        this.getModelFromHalModel(x, req, res);
                    });
                    return this.repository.bulkPost(req.body as Array<any>)
                        .then((result) => {
                            Enumerable.from(result).forEach(x => {
                                var resourceName = this.getFullBaseUrlUsingRepo(req, this.repository.modelName());
                                this.getHalModel1(x, resourceName + '/' + x['_id'], req, this.repository);
                            });
                            this.sendresult(req, res, result);
                        }).catch(error => {
                            this.sendError(res, error);
                        });
                }
            });



        //router.post(this.path + '/:id/:prop/:value', (req, res) => {
        //    return this.sendresult(req, res, req.params);
        //});

        // delete any property value
        router.delete(this.path + "/:id/:prop",
            this.ensureLoggedIn(this.entity, RepoActions.delete),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.delete)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                return this.repository.delete(req.params.id)
                    .then(result => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        // add or update any property value
        router.put(this.path + "/:id",
            this.ensureLoggedIn(this.entity, RepoActions.put),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.put)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                this.getModelFromHalModel(req.body, req, res);
                return this.repository.put(req.params.id, req.body)
                    .then((result) => {
                        var resourceName = this.getFullBaseUrl(req);// + this.repository.modelName();
                        this.getHalModel1(result, resourceName, req, this.repository);
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        // add or update any property value
        router.put(this.path,
            this.ensureLoggedIn(this.entity, RepoActions.put),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.put)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                if (!Array.isArray(req.body)) {
                    this.sendError(res, 'Invalid data.');
                    return;
                }

                Enumerable.from(req.body).forEach(x => {
                    this.getModelFromHalModel(x, req, res);
                });
                return this.repository.bulkPut(req.body as Array<any>)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.delete(this.path + "/:id",
            this.ensureLoggedIn(this.entity, RepoActions.delete),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.delete)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                return this.repository.delete(req.params.id)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        // bulk delete
        router.delete(this.path,
            this.ensureLoggedIn(this.entity, RepoActions.delete),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.delete)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                if (!Array.isArray(req.body)) {
                    this.sendError(res, 'Invalid data.');
                    return;
                }

                var ids = req.body;
                if (ids.length == 0) {
                    this.sendError(res, 'Invalid data.');
                    return;
                }

                return this.repository.bulkDel(ids)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.patch(this.path + "/:id",
            this.ensureLoggedIn(this.entity, RepoActions.patch),
            (req, res) => {
                if (!this.isAuthorize(req, res, RepoActions.patch)) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                this.getModelFromHalModel(req.body, req, res);
                return this.repository.patch(req.params.id, req.body)
                    .then((result) => {
                        var resourceName = this.getFullBaseUrl(req);// + this.repository.modelName();
                        this.getHalModel1(result, resourceName, req, this.repository);
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        this.sendError(res, error);
                    });
            });

    }

    addSearchPaths() {
        let modelRepo = this.repository.getEntityType();
        let decoratorFields = MetaUtils.getMetaData(modelRepo.model.prototype, Decorators.FIELD);
        let fieldsWithSearchIndex =
            Enumerable.from(decoratorFields)
                .where(ele => {
                    var meta: MetaData = ele as MetaData;
                    return meta.propertyKey
                        && meta
                        && meta.params
                        && (<any>meta.params).searchIndex;
                }).toArray();

        let searchPropMap = GetAllFindBySearchFromPrototype(modelRepo);

        var search = {};
        searchPropMap.forEach(map => {
            this.addRoutesForAllSearch(map, fieldsWithSearchIndex);
            search[map.key] = { "href": map.key, "params": map.args };
        });
        router.get(this.path + "/search", this.ensureLoggedIn(this.entity, 'search'), (req, res) => {
            let links = { "self": { "href": this.getFullBaseUrlUsingRepo(req, this.repository.modelName()) + "/search" } };
            for (var prop in search) {
                var lnk = {};
                lnk['href'] = this.getFullBaseUrlUsingRepo(req, this.repository.modelName()) + "/search/" + search[prop]["href"];
                lnk['params'] = search[prop]['params'];
                links[prop] = lnk;
            }
            this.sendresult(req, res, links);
        });
    }

    addActionPaths() {
        let modelRepo = this.repository.getEntityType();
        let searchPropMap = GetAllActionFromPrototype(modelRepo) as Array<IActionPropertyMap>;

        var actions = {};
        searchPropMap.forEach(map => {
            var meta = MetaUtils.getMetaData(this.entity, Decorators.UPLOAD, map.key);
            if (meta) {
                meta.params.destination
                router.post(this.path + "/action/" + map.key, this.ensureLoggedIn(this.entity, map.key), multer({
                    storage: multer.diskStorage({
                        destination: function (req, file, callback) {
                            callback(null, meta.params.destination);
                        }
                    })
                }).any(), (req, res) => {
                    Enumerable.from(req.query).forEach((x: any) => {
                        req.body[x.key] = x.value;
                    });
                    this.actionPathRender(req, res, map, modelRepo, actions, true);
                });
            }
            else {
                router.post(this.path + "/action/" + map.key, this.ensureLoggedIn(this.entity, map.key), (req, res) => {
                    this.actionPathRender(req, res, map, modelRepo, actions, false);
                });
                router.put(this.path + "/action/" + map.key, this.ensureLoggedIn(this.entity, map.key), (req, res) => {
                    this.actionPathRender(req, res, map, modelRepo, actions, false);
                });
            }
            actions[map.key] = { "href": map.key, "params": map.args };
        });

        router.get(this.path + "/action", this.ensureLoggedIn(this.entity, 'action'), (req, res) => {
            let links = { "self": { "href": this.getFullBaseUrlUsingRepo(req, this.repository.modelName()) + "/action" } };
            for (var prop in actions) {
                var lnk = {};
                lnk["href"] = this.getFullBaseUrlUsingRepo(req, this.repository.modelName()) + "/action/" + actions[prop]["href"];
                lnk['params'] = actions[prop]["params"];
                links[prop] = lnk;
            }
            this.sendresult(req, res, links);
        });
    }

    private actionPathRender(req, res, map, modelRepo, actions, hasFiles) {
        if (!this.isAuthorize(req, res, map.key)) {
            this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path + "/action/" + map.key);
            return;
        }

        if (req.method == "POST") {
            this.ensureALLRequiredPresent(modelRepo.model.prototype, req.body, req, res);
        }
        this.removeJSONIgnore(modelRepo.model.prototype, req.body, req);
        this.invokeModelFunction(map, req, res, actions, hasFiles);
    }

    private mergeEntity(req): Q.Promise<any> {
        return this.repository.findOne(req.body.id).then(result => {
            return Object.keys(result).forEach(attribute => {
                if (!req.body[attribute]) {
                    req.body[attribute] = result[attribute];
                }
            });
        }).catch(error => {
            winstonLog.logError('[DynamicController: mergeEntity]: mergeEntity error ' + error);
        });
    }

    private invokeModelFunction(map: ISearchPropertyMap, req: any, res: any, actions, hasFiles: boolean) {
        try {
            let modelRepo = this.repository.getEntityType();
            var param = [];
            if (hasFiles) {
                param.push(req.files);
            }
            for (var prop in req.body) {
                param.push(req.body[prop]);
            }
            param.push(req);
            var ret = modelRepo[map.key].apply(modelRepo, param);
            if (Utils.isPromise(ret)) { // is thenable
                var prom: Q.Promise<any> = <Q.Promise<any>>ret;
                prom.then(x => {
                    this.sendresult(req, res, x);
                }).catch(err => {
                    this.sendError(res, err);
                });;
            }
            else {
                this.sendresult(req, res, ret);
            }
        }
        catch (err) {
            this.sendError(res, err);
        }
    }

    private addRoutesForAllSearch(map: ISearchPropertyMap, fieldsWithSearchIndex: any[]) {
        let searchFromDb: boolean = true;
        if (configUtil.config().Config.ApplyElasticSearch) {
            let areAllSearchFieldsIndexed = Enumerable.from(map.args).intersect(fieldsWithSearchIndex).count() == map.args.length;
            searchFromDb = !areAllSearchFieldsIndexed;
        }

        // If all the search fields are not indexed in the elasticsearch, return data from the database
        // Keeping different router.get to avoid unncessary closure at runtime
        if (searchFromDb) {
            router.get(this.path + "/search/" + map.key, this.ensureLoggedIn(this.entity, map.key), (req, res) => {
                return this.isPreAuthenticated(req, res, map.key).then(isAllowed => {
                    if (isAllowed) {
                        return this.searchFromDb(req, res, map.key);
                    }
                });
            });
        }
        else { // Search from elasticsearch
            let model: any = this.repository.getModel();
            router.get(this.path + "/search/" + map.key, (req, res) => {
                return this.isPreAuthenticated(req, res, map.key).then(isAllowed => {
                    if (isAllowed) {
                        return this.searchUsingElastic(req, res, model, map);
                    }
                });
            });
        }
    }

    private isPreAuthenticated(req, res, propertyKey): Q.Promise<any> {
        var meta = MetaUtils.getMetaData(this.entity, Decorators.ALLOWANONYMOUS, propertyKey);
        if (meta) return Q.when(true);

        meta = MetaUtils.getMetaData(this.entity, Decorators.PREAUTHORIZE, propertyKey);
        if (meta) {
            return PreAuthService.isPreAuthenticated([req.body], meta.params, propertyKey).then(isAllowed => {
                if (!isAllowed) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                }
                return isAllowed;
            });
        }
        return Q.when(true);
    }

    private postFilter(result: any, propertyKey: any): Q.Promise<any> {
        var meta = MetaUtils.getMetaData(this.entity, Decorators.POSTFILTER, propertyKey);
        if (meta) {
            return PostFilterService.postFilter(result, meta.params);
        }
        return Q.when(result);
    }

    private searchFromDb(req, res, propertyKey) {
        var resourceName = this.getFullBaseUrlUsingRepo(req, this.repository.modelName());
        var queryObj = req.query;
        var options = {};
        Enumerable.from(queryObj).forEach((x: any) => {
            if (filterProps.indexOf(x.key) >= 0) {
                options[x.key] = x.value;
                delete queryObj[x.key];
            }
            else {
                var val = queryObj[x.key];
                var i = val.indexOf('%LIKE%');
                if (i == 0) {
                    // contains
                    val = val.replace('%LIKE%', '');
                    queryObj[x.key] = {
                        $regex: '.*' + val + '.*'
                    }
                }
                else {
                    i = val.indexOf('%START%');
                    if (i == 0) {
                        // starts with
                        val = val.replace('%START%', '');
                        queryObj[x.key] = {
                            $regex: '^' + val + '.*'
                        }
                    }
                }
            }
        });
        console.log("Querying Database");
        return this.repository
            .findWhere(queryObj, null, options)
            .then(result => {
                return this.postFilter(result, propertyKey);
            })
            .then((result: Array<any>) => {
                result.forEach(obj => {
                    this.getHalModel1(obj, resourceName + "/" + obj["_id"], req, this.repository);
                });
                this.sendresult(req, res, result);
            });
    }

    private searchUsingElastic(req, res, model, map) {
        let queryObj = req.query;
        let musts = map.args.map(function (arg) {
            let s = '{"' + arg + '":' + "0" + "}";
            let obj = JSON.parse(s);
            obj[arg] = queryObj[arg];
            return { "match": obj };
        });
        let query = {
            "query": {
                "bool": {
                    "must":
                    musts
                }
            }
        };
        winstonLog.logInfo('[DynamicController: addRoutesForAllSearch]: query ' + JSON.stringify(query));
        console.log("Querying Elastic search with %s", JSON.stringify(query));
        return model
            .search(query, (err, rr) => {
                if (err) {
                    console.error(err);
                    this.sendresult(req, res, err);
                }
                else {
                    console.log(rr);
                    this.postFilter(rr, map.key).then(result => {
                        this.sendresult(req, res, result);
                    });
                }
            });
    }

    private getHalModel(model: any, resourceName: string): any {
        var selfUrl = {};
        selfUrl["href"] = resourceName + "/" + model._id;
        var selfObjec = {};
        selfObjec["self"] = selfUrl;
        model["_links"] = selfObjec;

        return model;
    }

    private getModelFromHalModel(model: any, req: any, res: any) {
        if (model["_links"]) {
            delete model["_links"];
        }
        //code to handle jsonignore
        let modelRepo = this.repository.getEntityType();
        //code to handle @required fields.
        if (req.method == "POST") {
            this.ensureALLRequiredPresent(modelRepo.model.prototype, model, req, res);
        }
        this.removeJSONIgnore(modelRepo.model.prototype, model, req);

        //code to change url to id, for relations.
        if (req.method != "GET") {
            this.changeUrlToId(model, modelRepo.model.prototype);
        }
    }

    private changeUrlToId(model: any, entity: any) {
        var relations: Array<MetaData> = Utils.getAllRelationsForTargetInternal(entity) || [];
        relations.forEach(relation => {
            var param = <IAssociationParams>relation.params;
            if (!model[relation.propertyKey]) return;

            if (model[relation.propertyKey] instanceof Array) {
                var allElements = model[relation.propertyKey];
                if (allElements instanceof Array) {
                    allElements.forEach((element, index) => {
                        var arrElement = {};
                        arrElement['value'] = element;
                        this.trimUrl(arrElement, param);
                        allElements[index] = arrElement['value'];
                    });
                }
                return;
            }
            var element = {};
            element['value'] = model[relation.propertyKey];
            this.trimUrl(element, param);
            model[relation.propertyKey] = element['value'];
        });
    }

    private trimUrl(element, param) {
        if (element.value instanceof Object) {
            this.changeUrlToId(element.value, param.itemType);
        } else {
            if (element.value.indexOf('http') > -1 && element.value.indexOf('/') > -1) {
                element.value = element.value.trim();
                element.value = element.value.split("/").pop();
            }
        }

    }

    private getHalModel1(model: any, resourceName: string, req, repo: any): any {
        var selfUrl = {};
        selfUrl["href"] = resourceName;// + "/" + model._id;
        model["_links"] = {};
        model["_links"]["self"] = selfUrl;
        //add associations 
        //read metadata and get all relations names
        let modelRepo = repo.getEntityType();
        this.removeJSONIgnore(modelRepo.model.prototype, model, req);
        var relations: Array<MetaData> = Utils.getAllRelationsForTargetInternal(modelRepo.model.prototype) || [];
        relations.forEach(relation => {
            var relUrl = {};
            relUrl["href"] = resourceName + "/" + relation.propertyKey;
            model["_links"][relation.propertyKey] = relUrl;
            var repo = GetRepositoryForName(relation.params.rel);
            if (repo) {
                var param = relation.params;
                if (!param.embedded && !param.eagerLoading) { return model;}
                if (model[relation.propertyKey] instanceof Array) {
                    if (model[relation.propertyKey] && model[relation.propertyKey].length && Utils.isJSON(model[relation.propertyKey][0])) {
                        model[relation.propertyKey].forEach(key => {
                            var url = this.getFullBaseUrlUsingRepo(req, repo.modelName());
                            this.getHalModel1(key, url + '/' + key['_id'], req, repo);
                        });
                    }
                } else {
                    if (model[relation.propertyKey] && Utils.isJSON(model[relation.propertyKey])) {
                        var url = this.getFullBaseUrlUsingRepo(req, repo.modelName());
                        this.getHalModel1(model[relation.propertyKey], url + '/' + model[relation.propertyKey]['_id'], req, repo);
                    }
                }
            }
        });
        return model;
    }


    private removeJSONIgnore(entity: any, model: any, req: any) {
        if (!model) return;
        this.jsonIgnoreModels(entity, model, req);
        var relations: Array<MetaData> = Utils.getAllRelationsForTargetInternal(entity) || [];
        relations.forEach(relation => {
            var param = <IAssociationParams>relation.params;
            if (param.embedded || param.eagerLoading) {
                this.removeJSONIgnore(param.itemType, model[relation.propertyKey], req);
            }
        });
    }

    private jsonIgnoreModels(entity, model, req) {
        var decFields = MetaUtils.getMetaData(entity, Decorators.JSONIGNORE);
        if (decFields) {
            decFields.forEach(field => {
                if (model instanceof Array) {
                    model.forEach(mod => {
                        this.removePropertyFromModel(mod, field, req);
                    });
                } else {
                    this.removePropertyFromModel(model, field, req);
                }
            });
        }
    }

    private removePropertyFromModel(model: any, field: any, req: any) {
        var jsonIgnoreParams = field.params;
        if (jsonIgnoreParams && jsonIgnoreParams == JsonIgnore.READ && req.method != 'GET') {
            if (model[field.propertyKey]) {
                delete model[field.propertyKey];
            }
        }

        if (Object.keys(jsonIgnoreParams).length == 0 && model[field.propertyKey]) {
            delete model[field.propertyKey];
        }
    }

    private ensureALLRequiredPresent(entity: any, model: any, req: any, res: any) {
        if (!model) return;
        var decFields = MetaUtils.getMetaData(entity, Decorators.REQUIRED);
        if (decFields) {
            decFields.forEach(field => {
                if (model instanceof Array) {
                    model.forEach(mod => {
                        if (mod instanceof Object && !mod[field.propertyKey]) {
                            this.sendBadRequest(res, "required field not present in model");
                        }
                    });
                } else {
                    if (model instanceof Object && !model[field.propertyKey]) {
                        this.sendBadRequest(res, "required field not present in model");
                    }
                }
            });
        }
        var relations: Array<MetaData> = Utils.getAllRelationsForTargetInternal(entity) || [];
        relations.forEach(relation => {
            var param = <IAssociationParams>relation.params;
            if (param.embedded || param.eagerLoading) {
                this.ensureALLRequiredPresent(param.itemType, model[relation.propertyKey], req, res);
            }
        });
    }

    private getHalModels(models: Array<any>, resourceName: string): any {
        var halresult = {};
        halresult["_links"] = { "self": { "href": resourceName }, "search": { "href": "/search" } };
        models.forEach(model => {
            this.getHalModel(model, resourceName);
        });
        halresult["_embedded"] = models;
        return halresult;
    }

    private sendUnauthorizeError(res, error) {
        winstonLog.logError('[DynamicController: sendUnauthorizeError]: authorization error ' + error);
        res.set("Content-Type", "application/json");
        res.send(403, JSON.stringify(error, null, 4));
    }

    private sendError(res, error) {
        winstonLog.logError('[DynamicController: sendError]: error ' + error);
        res.set("Content-Type", "application/json");
        res.send(500, JSON.stringify(error, null, 4));
    }

    private sendBadRequest(res, error) {
        winstonLog.logError('[DynamicController: sendBadRequest]: bad request ' + error);
        res.set("Content-Type", "application/json");
        res.send(400, JSON.stringify(error, null, 4));
    }

    private sendresult(req, res, result) {
        res.set("Content-Type", "application/json");
        res.send(JSON.stringify(result, null, 4));
    }

    private getFullDataUrl(req): string {
        var fullbaseUr: string = "";
        fullbaseUr = this.getProtocol(req) + '://' + req.get('host') + "/" + configUtil.config().Config.basePath;
        return fullbaseUr;
    }

    private getFullBaseUrl(req): string {
        var fullbaseUr: string = "";
        fullbaseUr = this.getProtocol(req) + '://' + req.get('host') + req.originalUrl;
        return fullbaseUr;
    }

    private getFullBaseUrlUsingRepo(req, repoName): string {
        var fullbaseUr: string = "";
        fullbaseUr = this.getProtocol(req) + '://' + req.get('host') + '/' + configUtil.config().Config.basePath + '/' + repoName;
        return fullbaseUr;
    }

    private getProtocol(req): string {
        if (req.headers && req.headers["x-arr-ssl"]) {
            return "https";
        }
        else {
            return req.protocol;
        }
    }
}
