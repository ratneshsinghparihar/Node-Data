import { column, entity } from '../sequelizeimp/decorators';
import * as Sequelize from "sequelize";

export class BaseSequelize {

    constructor(params?:any){
        this.CreateDate = new Date();
    }

    @column({name: "name", type:Sequelize.STRING, allowNull:true})
    name: string;

    @column({ name: "CreateDate", type: Sequelize.DATE, allowNull: true })
    CreateDate: Date;

    @column({ name: "CreatedBy", type: Sequelize.INTEGER, allowNull: true })
    CreatedBy: number;

    @column({ name: "ModifyDate", type: Sequelize.DATE, allowNull: true })
    ModifyDate: Date;

    @column({ name: "ModifiedBy", type: Sequelize.INTEGER, allowNull: true })
    ModifiedBy: number;
}

export default BaseSequelize;