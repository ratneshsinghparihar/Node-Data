import {DecoratorType} from '../enums/decorator-type';
import {ParamTypeCustom} from './param-type-custom';
import {ReflectConstants} from '../constants';

/**
 * Creates new metadata object.
 * @class
 */
export class MetaData {
    /** Function prototype where decorator is declared.
    * @member {Object}
    */
    target: Object = null;
    /**
    * The decorator is declared on static method/property.
    * @member {Boolean}
    */
    isStatic: boolean;
    /**
    * The name of the method/property/paramter.
    * @member {string}
    */
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
            this.propertyType = new ParamTypeCustom(undefined, true);
        }else
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
