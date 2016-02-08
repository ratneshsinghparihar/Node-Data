/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
var param_type_custom_1 = require('./param-type-custom');
(function (DecoratorType) {
    DecoratorType[DecoratorType["CLASS"] = 0] = "CLASS";
    DecoratorType[DecoratorType["METHOD"] = 1] = "METHOD";
    DecoratorType[DecoratorType["PROPERTY"] = 2] = "PROPERTY";
})(exports.DecoratorType || (exports.DecoratorType = {}));
var DecoratorType = exports.DecoratorType;
var MetaData = (function () {
    function MetaData(target, decorator, decoratorType, params, propertyKey) {
        this.target = target;
        this.propertyKey = propertyKey;
        this.decorator = decorator;
        this.decoratorType = decoratorType;
        this.params = params;
        this.propertyType = Reflect.getMetadata("design:type", target, propertyKey);
        if (this.propertyType === Array && !params) {
            throw TypeError;
        }
        // If it is not relation type/array type return
        if (this.propertyType !== Array && !(params && params.rel)) {
            return;
        }
        this.propertyType = new param_type_custom_1.ParamTypeCustom(params.rel, this.propertyType, params.itemType);
    }
    return MetaData;
})();
exports.MetaData = MetaData;
function addMetaData(target, decorator, decoratorType, params, propertyKey) {
    if (!target) {
        throw TypeError;
    }
    // property/method decorator with no key passed
    if (arguments.length === 5 && !propertyKey) {
        throw TypeError;
    }
    target.decorators = target.decorators || {};
    target.decorators[decorator] = target.decorators[decorator] || {};
    if (getMetaData(target, decorator, propertyKey)) {
        // already added
        return;
    }
    target.decorators[decorator][propertyKey] = new MetaData(target, decorator, decoratorType, params, propertyKey);
}
exports.addMetaData = addMetaData;
function getMetaData(target, decorator, propertyKey) {
    if (!target || !decorator) {
        throw TypeError;
    }
    if (!target.decorators) {
        return null;
    }
    return target.decorators[decorator][propertyKey];
}
exports.getMetaData = getMetaData;
function getAllMetaDataForDecorator(target, decorator) {
    if (!target || !decorator) {
        throw TypeError;
    }
    if (!target.decorators) {
        return null;
    }
    return target.decorators[decorator];
}
exports.getAllMetaDataForDecorator = getAllMetaDataForDecorator;
function getAllMetaDataForAllDecorator(target) {
    if (!target) {
        throw TypeError;
    }
    if (!target.decorators) {
        return null;
    }
    var meta = {};
    for (var prop in target.decorators) {
        for (var prop1 in target.decorators[prop]) {
            var metaData = target.decorators[prop][prop1];
            meta[prop1] ? meta[prop1].push(metaData) : meta[prop1] = [metaData];
        }
    }
    return meta;
}
exports.getAllMetaDataForAllDecorator = getAllMetaDataForAllDecorator;
