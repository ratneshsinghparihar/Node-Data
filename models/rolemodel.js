var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var association_1 = require('../decorators/association');
var document_1 = require('../decorators/document');
var field_1 = require('../decorators/field');
var usermodel_1 = require('./usermodel');
var RoleModel = (function () {
    function RoleModel() {
    }
    __decorate([
        field_1.field(), 
        __metadata('design:type', Number)
    ], RoleModel.prototype, "_id");
    __decorate([
        field_1.field(), 
        __metadata('design:type', String)
    ], RoleModel.prototype, "name");
    __decorate([
        association_1.manytoone({ rel: 'users' }), 
        __metadata('design:type', usermodel_1.UserModel)
    ], RoleModel.prototype, "user");
    RoleModel = __decorate([
        document_1.document({ name: 'roles' }), 
        __metadata('design:paramtypes', [])
    ], RoleModel);
    return RoleModel;
})();
exports.RoleModel = RoleModel;
