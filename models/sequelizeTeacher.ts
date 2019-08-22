import { column, entity } from '../sequelizeimp/decorators';
import * as Sequelize from "sequelize";
import {BaseSequelize} from './baseSequelizeModel';
import {SequelizeStudent} from './sequelizeStudent';
import {manytoone} from '../core/decorators';

@entity({ name: 'teacher', tableName: 'sequelize_teacher', timestamps: false, freezeTableName: true })
export class SequelizeTeacher extends BaseSequelize {

    @column({ name: "Id", type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true })
    Id: number;

    @column({ name: "name", type: Sequelize.STRING, allowNull: false })
    name: string;
    
    // by default it will choose primary key of the table
    @manytoone({ rel: 'sequelize_student', itemType: SequelizeStudent, eagerLoading: true,foreignKey:'StudentID' })
    Student: SequelizeStudent;

    @column({name: "StudentID", type:Sequelize.INTEGER, allowNull:true})
    StudentID:number;
}

export default SequelizeTeacher;