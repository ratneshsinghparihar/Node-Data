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
var UserModel = (function () {
    // constructor(){
    //     this._id=0;
    //     this.name="";
    //     this.roles=new Array<RoleModel>();
    // }
    function UserModel(userDto) {
        this._links = {};
        this._id = userDto._id;
        this.name = userDto.name;
        if (userDto.roles)
            this.roles = userDto.roles;
    }
    __decorate([
        field_1.field(), 
        __metadata('design:type', String)
    ], UserModel.prototype, "_id");
    __decorate([
        field_1.field(), 
        __metadata('design:type', String)
    ], UserModel.prototype, "name");
    __decorate([
        field_1.field({ itemType: String }), 
        __metadata('design:type', Array)
    ], UserModel.prototype, "courses");
    __decorate([
        association_1.onetomany({ mappedBy: 'user', rel: 'roles' }), 
        __metadata('design:type', Array)
    ], UserModel.prototype, "roles");
    __decorate([
        field_1.field(), 
        __metadata('design:type', Object)
    ], UserModel.prototype, "_links");
    UserModel = __decorate([
        document_1.document({ name: 'users' }), 
        __metadata('design:paramtypes', [Object])
    ], UserModel);
    return UserModel;
})();
exports.UserModel = UserModel;
