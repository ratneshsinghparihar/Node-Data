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
var decorator = require("../decorators/repository");
//import * as repository from "../decorators/repository";
var usermodel_1 = require('../models/usermodel');
var UserRepository = (function () {
    //public static path: string = '/user';
    function UserRepository() {
        //super(UserRepository.path, UserModel);
        //new BaseRepository1(this.path, User1);
    }
    UserRepository = __decorate([
        decorator.repository('/user', usermodel_1.UserModel), 
        __metadata('design:paramtypes', [])
    ], UserRepository);
    return UserRepository;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserRepository;
