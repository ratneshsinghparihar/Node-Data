import * as decorator from "../core/decorators/repository";
import { DynamicRepository } from '../core/dynamic/dynamic-repository';
import {SequelizeSchool} from '../models/sequelizeSchool';

@decorator.repository({ path: 'school', model: SequelizeSchool })
export class SchoolRepository extends DynamicRepository {

    doGetSchoolWithProps(id, properties){
        return this.findWhere({Id:id}, properties);
    }

}

export default SchoolRepository