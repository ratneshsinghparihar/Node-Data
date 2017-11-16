import {repository} from "../../core/decorators";
import {company} from '../models/company';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'company', model: company })
export default class CompanyRepository extends DynamicRepository {
}
