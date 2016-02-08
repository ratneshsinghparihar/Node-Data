/// <reference path="../typings/node/node.d.ts" />
//var Config1 = require('../repos');
var express = require('express');
var Reflect = require('reflect-metadata');
exports.router = express.Router();
var DynamicController = (function () {
    function DynamicController(path, repository) {
        this.repository = repository;
        this.path = path;
        this.addRoutes();
    }
    DynamicController.prototype.addRoutes = function () {
        var _this = this;
        exports.router.get(this.path, function (req, res) {
            return _this.repository.findAll()
                .then(function (result) {
                result = _this.getHalModels(result, _this.repository.modelName());
                _this.sendresult(req, res, result);
            });
        });
        exports.router.get(this.path + '/:id', function (req, res) {
            return _this.repository.findOne(req.params.id)
                .then(function (result) {
                _this.getHalModel1(result, _this.repository.modelName(), _this.repository.getEntityType());
                _this.sendresult(req, res, result);
            });
        });
        exports.router.get(this.path + '/:id/:prop', function (req, res) {
            return _this.repository.findChild(req.params.id, req.params.prop)
                .then(function (result) {
                //result=this.getHalModel1(result,this.repository.modelName(),this.repository.getEntityType());
                //var propTypeName = Reflect.getMetadata("design:type", result.toObject()[req.params.prop], req.params.prop);
                _this.getHalModel1(result, _this.repository.modelName(), _this.repository.getEntityType());
                var parent = result.toObject();
                var association = parent[req.params.prop];
                //var propName=Reflect.getMetadata("design:type", association, req.params.prop);
                // var resourceName= Reflect.getMetadata("design:type", association);
                //this.getHalModel(association,req.params.prop);
                _this.sendresult(req, res, association);
            });
        });
        exports.router.post(this.path, function (req, res) {
            return _this.repository.post(req.body)
                .then(function (result) {
                _this.sendresult(req, res, result);
            });
        });
        exports.router.put(this.path + "/:id", function (req, res) {
            return _this.repository.put(req.params.id, req.body)
                .then(function (result) {
                _this.sendresult(req, res, result);
            });
        });
        exports.router.delete(this.path + "/:id", function (req, res) {
            return _this.repository.delete(req.params.id)
                .then(function (result) {
                _this.sendresult(req, res, result);
            });
        });
        exports.router.patch(this.path + "/:id", function (req, res) {
            return _this.repository.patch(req.params.id, req.body)
                .then(function (result) {
                _this.sendresult(req, res, result);
            });
        });
    };
    DynamicController.prototype.getHalModel = function (model, resourceName) {
        var selfUrl = {};
        selfUrl["href"] = "/" + resourceName + "/" + model._id;
        var selfObjec = {};
        selfObjec["self"] = selfUrl;
        model["_links"] = selfObjec;
        return model;
    };
    DynamicController.prototype.getHalModel1 = function (model, resourceName, resourceType) {
        var dbModel = model._doc;
        var entityModel = new resourceType(dbModel);
        var selfUrl = {};
        selfUrl["href"] = "/" + resourceName + "/" + model._doc._id;
        var selfObjec = {};
        selfObjec["self"] = selfUrl;
        entityModel["_links"]["self"] = selfUrl;
        model._doc = entityModel;
        return model;
    };
    DynamicController.prototype.getHalModels = function (models, resourceName) {
        var _this = this;
        var halresult = {};
        halresult["_links"] = { "self": { "href": "/" + resourceName }, "search": { "href": "/search" } };
        models.forEach(function (model) {
            _this.getHalModel(model, resourceName);
        });
        halresult["_embedded"] = models;
        return halresult;
    };
    DynamicController.prototype.sendresult = function (req, res, result) {
        res.set("Content-Type", "application/json");
        res.send(JSON.stringify(result, null, 4));
    };
    return DynamicController;
})();
exports.DynamicController = DynamicController;
