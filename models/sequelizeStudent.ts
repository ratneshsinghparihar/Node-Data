import { column, entity } from '../sequelizeimp/decorators';
import * as Sequelize from "sequelize";
import { BaseSequelize } from './baseSequelizeModel';
import { manytoone, onetomany } from '../core/decorators';
import { SequelizeTeacher } from './sequelizeTeacher';
import { SequelizeSchool } from './sequelizeSchool';

@entity({ name: 'student', tableName: 'sequelize_student', timestamps: false, freezeTableName: true })
export class SequelizeStudent extends BaseSequelize {

    @column({ name: "Id", type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true })
    Id: number;

    @column({ name: "name", type: Sequelize.STRING, allowNull: false })
    name: string;

    //foreign key
    @manytoone({ rel: 'sequelize_teacher', itemType: SequelizeTeacher, eagerLoading: true, foreignKey: 'TeacherId' })
    Teacher: SequelizeTeacher;

    @column({ name: "TeacherId", type: Sequelize.INTEGER, allowNull: false })
    TeacherId: number;
}

export default SequelizeStudent;