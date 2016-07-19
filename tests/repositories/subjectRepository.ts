import {repository, allowanonymous} from "../../core/decorators";
import {subject} from '../models/subject';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';
import {authorize} from '../../core/decorators/authorize';
import {preauthorize} from '../../core/decorators/preauthorize';
import {postfilter} from '../../core/decorators/postfilter';

@repository({ path: 'subject', model: subject })
export default class CourseRepository extends DynamicRepository {

    //@authorize({ roles: ['ROLE_A'] })
    //@postfilter({ serviceName: "preauthservice", methodName: "PostFilter" })
    @preauthorize({ serviceName: "preauthservice", methodName: "CanEdit" })//, params: { id: '#id', entity: '#entity', other: [false] } })
    @allowanonymous()
    findAll(): Q.Promise<any> {
        return super.findAll();
    }
}
