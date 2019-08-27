import {onetomany, manytoone, manytomany} from '../core/decorators';
import {column, entity} from '../sequelizeimp/decorators';
import {Strict} from '../sequelizeimp/enums';
import * as Sequelize from "sequelize";
import {BlogSqlModel} from "./blogSqlModel"

@entity({ name:'tbl_blog_post2', tableName: 'tbl_blog_post2',timestamps:false })
export class BlogPostSqlModel {
    @column({name:"id", type: Sequelize.INTEGER, autoIncrement:true, allowNull:false, primaryKey: true })
    _id: number;

    @column({ name: "name", type: Sequelize.STRING(128), defaultValue:"defaultBlog" })
    name: string;   

    @manytoone({ rel: 'tbl_blog2', itemType: BlogSqlModel, eagerLoading: true, foreignKey:'blogId' })
    blog: BlogSqlModel;

    @column({ name: "blogId", type: Sequelize.INTEGER, allowNull:true })
    blogId:number
}

export default BlogPostSqlModel;