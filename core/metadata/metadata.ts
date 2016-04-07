import {DecoratorType} from '../enums/decorator-type';
import {ParamTypeCustom} from './param-type-custom';
import {ReflectConstants} from '../constants';
import * as ReflectUtils from '../reflect/reflect-utils';

export interface IMetaOptions {
    decorator: string;
    decoratorType: DecoratorType;
    params?: any;
    propertyKey?: string;
    paramIndex?: number;
    paramTypes?: Array<ParamTypeCustom>;
    type?: ParamTypeCustom;
    returnType?: ParamTypeCustom;
}

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
    returnType: ParamTypeCustom;
    paramTypes: Array<ParamTypeCustom>
    params: any;
    decoratorType: DecoratorType;
    paramIndex: number;

    constructor(target: Object, isStatic: boolean, metaOptions: IMetaOptions) {
        this.target = target;
        this.isStatic = isStatic;
        this.propertyKey = metaOptions.propertyKey;
        this.paramIndex = metaOptions.paramIndex;
        this.decorator = metaOptions.decorator;
        this.decoratorType = metaOptions.decoratorType;
        this.params = metaOptions.params;
        this.propertyType = metaOptions.type || ReflectUtils.getDesignType(target, metaOptions.propertyKey);
        this.returnType = metaOptions.returnType || ReflectUtils.getReturnType(target, metaOptions.propertyKey);
        this.paramTypes = metaOptions.paramTypes || ReflectUtils.getParamTypes(target, metaOptions.propertyKey);      
        var type = (<any>Reflect).getMetadata(ReflectConstants.DESIGNTYPE, target, this.propertyKey);
           if (type === Array && !this.params) {
            this.propertyType = new ParamTypeCustom(undefined, true);
        }else
        // If it is not relation type/array type
        //if (type !== Array && !(params && (<any>params).rel)) {
        //    this.propertyType = new ParamTypeCustom((<any>params).rel, this.propertyType, (<any>params).itemType);
        //}

               if ((this.params && (<any>this.params).rel) || type === Array) {
                   this.propertyType = new ParamTypeCustom((<any>this.params).itemType, type === Array);
        } else {
            this.propertyType = new ParamTypeCustom(type, false);
        }
    }
}
