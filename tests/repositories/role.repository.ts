import {repository} from "../../core/decorators";
import {RoleModel} from '../models/rolemodel';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';
import {authorize} from '../../core/decorators/authorize';
import {preauthorize} from '../../core/decorators/preauthorize';
var Q = require('q');

@repository({ path: 'roles', model: RoleModel })
export default class RoleRepository extends DynamicRepository {

}
