//import * as Express from "express";
//var Dynamic = require('../dynamic/dynamic')
//var BaseRepository = require('./baserepository')
//var UserModel = require('../models/user')
import base from "../dynamic/baserepository";
import * as decorator from "../decorators/repository";
//import * as repository from "../decorators/repository";
import {UserModel} from '../models/usermodel';

@decorator.repository('/user', UserModel)
export default class UserRepository {
    //public static path: string = '/user';

    constructor() {
        //super(UserRepository.path, UserModel);
        //new BaseRepository1(this.path, User1);
    }

   findByNameAndAge(){}

}
