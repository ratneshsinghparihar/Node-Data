import {Decorators} from '../constants';
import {DecoratorType} from '../enums';

import * as Utils from "../metadata/utils";
import {MetaData} from '../metadata/metadata';

export function entityservice(target: Object) {
    Utils.addMetaData(target, Decorators.ONETOMANY, DecoratorType.PROPERTY, {});
}
