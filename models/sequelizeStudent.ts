import { column, entity } from '../sequelizeimp/decorators';
import * as Sequelize from "sequelize";
import {BaseSequelize} from './baseSequelizeModel';

@entity({ name: 'student', tableName: 'sequelize_student', timestamps: false, freezeTableName: true })
export class SequelizeStudent extends BaseSequelize {

    @column({ name: "Id", type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true })
    Id: number;

    @column({ name: "name", type: Sequelize.STRING, allowNull: false })
    name: string;
}

export default SequelizeStudent;