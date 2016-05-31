import * as configUtil from '../utils';
var express = require('express');
import {DynamicRepository, GetRepositoryForName} from './dynamic-repository';
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

var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
import * as securityImpl from './security-impl';
var Enumerable: linqjs.EnumerableStatic = require('linq');
var Q = require('q');
import {JsonIgnore} from '../enums/jsonignore-enum';

export class DynamicController {
    private repository: DynamicRepository;
    private path: string;

    constructor(path: string, repository: DynamicRepository) {
        this.repository = repository;
        this.path = "/" + Utils.config().Config.basePath + "/" + path;
        this.addSearchPaths();
        this.addActionPaths();
        this.addRoutes();
    }

    addRoutes() {
        router.get(this.path,
            securityImpl.ensureLoggedIn(),
            (req, res) => {
                if (!securityImpl.isAuthorize(req, this.repository, 'findAll')) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                var promise = this.repository.findAll();
                return promise
                    .then((result) => {
                        var resourceName = this.getFullBaseUrl(req);// + this.repository.modelName();
                        Enumerable.from(result).forEach(x => {
                            x = this.getHalModel1(x, resourceName + "/" + x._id, req, this.repository);
                        });
                        //result = this.getHalModels(result,resourceName);
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.get(this.path + '/:id',
            securityImpl.ensureLoggedIn(),
            (req, res) => {
                if (!securityImpl.isAuthorize(req, this.repository, 'findOne')) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                return this.repository.findOne(req.params.id)
                    .then((result) => {
                        var resourceName = this.getFullBaseUrl(req);// + this.repository.modelName();
                        this.getHalModel1(result, resourceName, req, this.repository);
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.get(this.path + '/:id/:prop',
            securityImpl.ensureLoggedIn(),
            (req, res) => {
                if (!securityImpl.isAuthorize(req, this.repository, 'findChild')) {
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
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.post(this.path,
            securityImpl.ensureLoggedIn(),
            (req, res) => {
                if (!securityImpl.isAuthorize(req, this.repository, 'post')) {
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
                            console.log(error);
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
                            console.log(error);
                            this.sendError(res, error);
                        });
                }
            });



        //router.post(this.path + '/:id/:prop/:value', (req, res) => {
        //    return this.sendresult(req, res, req.params);
        //});

        // delete any property value
        router.delete(this.path + "/:id/:prop",
            securityImpl.ensureLoggedIn(),
            (req, res) => {
                if (!securityImpl.isAuthorize(req, this.repository, 'delete')) {
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
            securityImpl.ensureLoggedIn(),
            (req, res) => {
                if (!securityImpl.isAuthorize(req, this.repository, 'put')) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }

                this.getModelFromHalModel(req.body, req, res);
                return this.repository.put(req.params.id, req.body)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        // add or update any property value
        router.put(this.path,
            securityImpl.ensureLoggedIn(),
            (req, res) => {
                if (!securityImpl.isAuthorize(req, this.repository, 'put')) {
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
            securityImpl.ensureLoggedIn(),
            (req, res) => {
                if (!securityImpl.isAuthorize(req, this.repository, 'delete')) {
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

        router.patch(this.path + "/:id",
            securityImpl.ensureLoggedIn(),
            (req, res) => {
                if (!securityImpl.isAuthorize(req, this.repository, 'patch')) {
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                    return;
                }
                this.getModelFromHalModel(req.body, req, res);
                return this.repository.patch(req.params.id, req.body)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
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
        router.get(this.path + "/search", securityImpl.ensureLoggedIn(), (req, res) => {
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
            router.post(this.path + "/action/" + map.key, securityImpl.ensureLoggedIn(), (req, res) => {
                this.actionPathRender(req, res, map, modelRepo, actions);
            });
            router.put(this.path + "/action/" + map.key, securityImpl.ensureLoggedIn(), (req, res) => {
                this.actionPathRender(req, res, map, modelRepo, actions);
            });
            actions[map.key] = { "href": map.key, "params": map.args };
        });

        router.get(this.path + "/action", securityImpl.ensureLoggedIn(), (req, res) => {
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

    private actionPathRender(req, res, map, modelRepo, actions) {
        if (!securityImpl.isAuthorize(req, this.repository, map.key)) {
            this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path + "/action/" + map.key);
            return;
        }

        if (req.method == "POST") {
            this.ensureALLRequiredPresent(modelRepo.model.prototype, req.body, req, res);
        }
        this.removeJSONIgnore(modelRepo.model.prototype, req.body, req);

        if (req.method == "PUT" || req.method == "PATCH") {
            this.mergeEntity(req).then(result => {
                this.preAuthFunc(req, res, map, actions);
            });
        } else {
            this.preAuthFunc(req, res, map, actions);
        }

    }


    private mergeEntity(req): Q.Promise<any> {
        return this.repository.findOne(req.body.id).then(result => {
            return Object.keys(result).forEach(attribute => {
                if (!req.body[attribute]) {
                    req.body[attribute] = result[attribute];
                }
            });
        }).catch(error => {

        });
    }

    private preAuthFunc(req, res, map, actions) {
        var preAuth = MetaUtils.getMetaData(this.repository.getEntityType(), Decorators.PREAUTHORIZE, map.key);
        if (preAuth) {
            var preAuthParam = <IPreauthorizeParams>preAuth.params;
            var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
            var service = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == preAuthParam.serviceName).select(x => x.metadata[0]).firstOrDefault();

            if (service) {
                var param = [];
                if (preAuthParam.params.id == '#id') {
                    param.push(req.user._id.toString());
                }
                if (preAuthParam.params.entity == '#entity') {
                    param.push(req.body);
                }
                if (preAuthParam.params.other) {
                    for (var i in preAuthParam.params.other) {
                        param.push(preAuthParam.params.other[i]);
                    }
                }

                service.target[preAuthParam.methodName].apply(service.target, param)
                    .then((isAllowed) => {
                        if (!isAllowed) {
                            this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path + "/action/" + map.key);
                            return;
                        }
                        this.invokeModelFunction(map, req, res, actions);
                    })
                    .catch((err) => {
                        throw err;
                    })
            }
        } else {
            this.invokeModelFunction(map, req, res, actions);
        }
    }


    private invokeModelFunction(map: ISearchPropertyMap, req: any, res: any, actions) {
        try {
            let modelRepo = this.repository.getEntityType();
            var param = [];
            for (var prop in req.body) {
                param.push(req.body[prop]);
            }
            param.push(req);
            var ret = modelRepo[map.key].apply(modelRepo, param);
            if (ret['then'] instanceof Function) { // is thenable
                var prom: Q.Promise<any> = <Q.Promise<any>>ret;
                prom.then(x => {
                    this.sendresult(req, res, x);
                });
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
            router.get(this.path + "/search/" + map.key, securityImpl.ensureLoggedIn(), (req, res) => {
                var queryObj = req.query;
                console.log("Querying Database");
                return this.repository
                    .findWhere(queryObj)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    });

            });
        }
        else { // Search from elasticsearch
            let model: any = this.repository.getModel();
            router.get(this.path + "/search/" + map.key, (req, res) => {
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
                console.log("Querying Elastic search with %s", JSON.stringify(query));
                return model
                    .search(query, (err, rr) => {
                        if (err) {
                            console.error(err);
                            this.sendresult(req, res, err);
                        }
                        else {
                            console.log(rr);
                            this.sendresult(req, res, rr);
                        }
                    });
            });
        }
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

    private trimUrl(element,param) {
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
                if (!param.embedded && !param.eagerLoading) { return model };
                if (model[relation.propertyKey] instanceof Array) {
                    if (model[relation.propertyKey] && model[relation.propertyKey].length) {
                        model[relation.propertyKey].forEach(key => {
                            var url = this.getFullBaseUrlUsingRepo(req, repo.modelName());
                            this.getHalModel1(key, url + '/' + key['_id'], req, repo);
                        });
                    }
                } else {
                    if (model[relation.propertyKey]) {
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
        res.set("Content-Type", "application/json");
        res.send(401, JSON.stringify(error, null, 4));
    }

    private sendError(res, error) {
        res.set("Content-Type", "application/json");
        res.send(500, JSON.stringify(error, null, 4));
    }

    private sendBadRequest(res, error) {
        res.set("Content-Type", "application/json");
        res.send(400, JSON.stringify(error, null, 4));
    }

    private sendresult(req, res, result) {
        res.set("Content-Type", "application/json");
        res.send(JSON.stringify(result, null, 4));
    }

    private getFullDataUrl(req): string {
        var fullbaseUr: string = "";
        fullbaseUr = req.protocol + '://' + req.get('host') + "/" + configUtil.config().Config.basePath;
        return fullbaseUr;
    }

    private getFullBaseUrl(req): string {
        var fullbaseUr: string = "";
        fullbaseUr = req.protocol + '://' + req.get('host') + req.originalUrl;
        return fullbaseUr;
    }

    private getFullBaseUrlUsingRepo(req, repoName): string {
        var fullbaseUr: string = "";
        fullbaseUr = req.protocol + '://' + req.get('host') + '/' + configUtil.config().Config.basePath + '/' + repoName;
        return fullbaseUr;
    }
}
