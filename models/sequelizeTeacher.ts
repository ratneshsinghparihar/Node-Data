import { column, entity } from '../sequelizeimp/decorators';
import * as Sequelize from "sequelize";
import {BaseSequelize} from './baseSequelizeModel';
import {SequelizeStudent} from './sequelizeStudent';
import {manytoone} from '../core/decorators';

@entity({ name: 'teacher', tableName: 'sequelize_teacher', timestamps: false, freezeTableName: true })
export class SequelizeTeacher extends BaseSequelize {

    @column({ name: "Id", type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true })
    Id: number;

    // by default it will choose primary key of the table
    @manytoone({ rel: 'sequelize_student', itemType: SequelizeStudent, eagerLoading: true, properties:['name'], alias:'Student_Detail'})
    Student: number;

    Student_Detail:SequelizeStudent;
}

export default SequelizeTeacher;