import {repository} from "../../core/decorators";
import {topic} from '../models/topic';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'topic', model: topic })
export default class TopicRepository extends DynamicRepository {
    doTestFindWhere(query: any) {
        return this.findWhere(query);
    }
}
