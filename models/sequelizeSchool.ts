import { column, entity } from '../sequelizeimp/decorators';
import * as Sequelize from "sequelize";
import {BaseSequelize} from './baseSequelizeModel';
import {SequelizeTeacher} from './sequelizeTeacher';
import {manytoone,onetomany} from '../core/decorators';
import SequelizeStudent from './sequelizeStudent';
 
@entity({ name: 'school', tableName: 'sequelize_school', timestamps: false, freezeTableName: true })
export class SequelizeSchool extends BaseSequelize {

    @column({ name: "Id", type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true })
    Id: number;

    @column({ name: "name", type: Sequelize.STRING, allowNull: false })
    name: string;

    @onetomany({ rel: 'sequelize_teacher', itemType: SequelizeTeacher, eagerLoading: true, foreignKey:'SchoolID'})
    Teachers: Array<SequelizeTeacher>;
}

export default SequelizeTeacher;