import { column, entity } from '../sequelizeimp/decorators';
import * as Sequelize from "sequelize";
import { BaseSequelize } from './baseSequelizeModel';
import { SequelizeStudent } from './sequelizeStudent';
import { manytoone, onetomany } from '../core/decorators';
import { SequelizeSchool } from './sequelizeSchool';

@entity({ name: 'teacher', tableName: 'sequelize_teacher', timestamps: false, freezeTableName: true })
export class SequelizeTeacher extends BaseSequelize {

    @column({ name: "Id", type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true })
    Id: number;

    @column({ name: "name", type: Sequelize.STRING, allowNull: false })
    name: string;

    @onetomany({ rel: 'sequelize_student', itemType: SequelizeStudent, eagerLoading: true,foreignKey:'TeacherId' })
    Students: Array<SequelizeStudent>;

    @manytoone({ rel: 'sequelize_school', itemType: SequelizeSchool, eagerLoading: true,foreignKey:'SchoolID' })
    School: SequelizeSchool;

    @column({name: "SchoolID", type:Sequelize.INTEGER, allowNull:true})
    SchoolID:number;

}

export default SequelizeTeacher;