import {DecoratorType} from '../../enums/decorator-type';
import {ParamTypeCustom} from './param-type-custom';
import {IDocumentParams} from '../interfaces/document-params';
import {IRepositoryParams} from '../interfaces/repository-params';
import {IFieldParams} from '../interfaces/field-params';
import {IAssociationParams} from '../interfaces/association-params';
import {IInjectParams} from '../interfaces/inject-params';
import {ReflectConstants} from '../../constants';

export class MetaData {
    target: Object;
    propertyKey: string;
    decorator: string;
    propertyType: ParamTypeCustom;
    params: IFieldParams | IAssociationParams | IDocumentParams | IRepositoryParams | IInjectParams;
    decoratorType: DecoratorType;
    paramIndex: number;

    constructor(target: Object, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey: string, paramIndex: number) {
        this.target = target;
        this.propertyKey = propertyKey;
        this.paramIndex = paramIndex;
        this.decorator = decorator;
        this.decoratorType = decoratorType;
        this.params = params;
        var type = Reflect.getMetadata(ReflectConstants.DESIGNTYPE, target, propertyKey);

        if (type === Array && !params) {
            throw TypeError;
        }
        // If it is not relation type/array type
        //if (type !== Array && !(params && (<any>params).rel)) {
        //    this.propertyType = new ParamTypeCustom((<any>params).rel, this.propertyType, (<any>params).itemType);
        //}

        if ((params && (<any>params).rel) || type === Array) {
            this.propertyType = new ParamTypeCustom((<any>params).rel, (<any>params).itemType, type === Array, (<any>params).embedded, ((<any>params).level ? (<any>params).level : -1));
        } else {
            this.propertyType = new ParamTypeCustom(null, type, false, false, -1);
        }
    }
}
