import {Strict} from '../../enums/entity-strict';

export interface IEntityParams {
    tableName: string,
    timestamps: boolean,
    createdAt: string,
    updatedAt: string,
}