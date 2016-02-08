var Utils = require("./metadata/utils");
function document(params) {
    if (params === void 0) { params = {}; }
    return function (target) {
        console.log('document - target: ', target);
        for (var field in target.fields) {
            console.log(field);
        }
        // add metadata to prototype
        Utils.addMetaData((target.prototype || target), "document", Utils.DecoratorType.CLASS, params);
    };
}
exports.document = document;
