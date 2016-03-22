import {DecoratorType} from '../enums/decorator-type';
import {ParamTypeCustom} from './param-type-custom';
import {ReflectConstants} from '../constants';

export class MetaData {
    target: Object;
    isStatic: boolean;
    propertyKey: string;
    decorator: string;
    propertyType: ParamTypeCustom;
    params: any;
    decoratorType: DecoratorType;
    paramIndex: number;

    constructor(target: Object, isStatic: boolean, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey: string, paramIndex: number) {
        this.target = target;
        this.isStatic = isStatic;
        this.propertyKey = propertyKey;
        this.paramIndex = paramIndex;
        this.decorator = decorator;
        this.decoratorType = decoratorType;
        this.params = params;
        var type = (<any>Reflect).getMetadata(ReflectConstants.DESIGNTYPE, target, propertyKey);

        if (type === Array && !params) {
            throw TypeError;
        }
        // If it is not relation type/array type
        //if (type !== Array && !(params && (<any>params).rel)) {
        //    this.propertyType = new ParamTypeCustom((<any>params).rel, this.propertyType, (<any>params).itemType);
        //}

        if ((params && (<any>params).rel) || type === Array) {
            this.propertyType = new ParamTypeCustom((<any>params).itemType, type === Array);
        } else {
            this.propertyType = new ParamTypeCustom(type, false);
        }
    }
}
