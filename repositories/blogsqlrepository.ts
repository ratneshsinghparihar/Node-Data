//import * as Express from "express";
import * as decorator from "../core/decorators/repository";
import {BlogSqlModel} from '../models/blogSqlModel';

@decorator.repository({ path: 'blogs', model: BlogSqlModel })
//@decorator.repository('blog', BlogModel)
export default class BlogSqlRepository {

    constructor() {
        //super(RoleRepository.path, role.IRole);
        //new BaseRepository1(this.path, User1);
    }
}
