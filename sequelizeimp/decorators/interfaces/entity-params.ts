import {IDecoratorParams} from '../../../core/decorators/interfaces/decorator-params';

export interface IEntityParams extends IDecoratorParams {
    tableName: string,
    timestamps: boolean
}