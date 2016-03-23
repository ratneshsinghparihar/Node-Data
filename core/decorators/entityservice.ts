import {Decorators} from '../constants';
import {DecoratorType} from '../enums';

import {MetaUtils} from "../metadata/utils";
import {MetaData} from '../metadata/metadata';

export function entityservice(target: Object) {
    MetaUtils.addMetaData(target, Decorators.ONETOMANY, DecoratorType.PROPERTY, {});
}
