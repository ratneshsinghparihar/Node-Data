import {column, entity} from '../sequelizeimp/decorators';
import * as Sequelize from "sequelize";

@entity({ name:'tbl_blog2', tableName: 'tbl_blog2', timestamps: false, freezeTableName: true })
export class BlogSqlModel {
    @column({ name:"id", type: Sequelize.INTEGER, allowNull:false, primaryKey: true })
    _id: number;

    @column({ name: "name", type: Sequelize.STRING(128), allowNull: false })
    name: string;
}

export default BlogSqlModel;