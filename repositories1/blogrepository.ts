//import * as Express from "express";
//var Dynamic = require('../dynamic/dynamic')
import * as role from '../models/role';
import base from "../dynamic/baserepository";
import * as decorator from "../decorators/repository";
import {BlogModel} from '../models/blogmodel';

@decorator.repository('blog', BlogModel)
export default class RoleRepository {

    constructor() {
        //super(RoleRepository.path, role.IRole);
        //new BaseRepository1(this.path, User1);
    }
}
