import { column, entity } from '../sequelizeimp/decorators';
import * as Sequelize from "sequelize";
import {BaseSequelize} from './baseSequelizeModel';
import {SequelizeTeacher} from './sequelizeTeacher';
import {manytoone} from '../core/decorators';

@entity({ name: 'school', tableName: 'sequelize_school', timestamps: false, freezeTableName: true })
export class SequelizeSchool extends BaseSequelize {

    @column({ name: "Id", type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true })
    Id: number;

    // by default it will choose primary key of the table
    @manytoone({ rel: 'sequelize_teacher', itemType: SequelizeTeacher, eagerLoading: true, properties:['name','Student'], alias:'TeacherDetail'})
    Teacher: number;

    // alias should not be assigned as a column
    TeacherDetail:SequelizeTeacher;
}

export default SequelizeTeacher;