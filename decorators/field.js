var Utils = require("./metadata/utils");
function field(params) {
    return function (target, propertyKey) {
        console.log('field - propertyKey: ', propertyKey, ', target:', target);
        var aa = params;
        Utils.addMetaData(target, "field", Utils.DecoratorType.PROPERTY, params, propertyKey);
    };
}
exports.field = field;
