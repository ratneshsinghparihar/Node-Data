import {onetomany, manytoone, manytomany} from '../core/decorators';
import {field, document} from '../mongoose/decorators';
import {Strict} from '../mongoose/enums';
import {BaseModel} from './baseModel';

@document({ name: 'stories', strict: Strict.true })
export class StoryModel extends BaseModel {
}

export default StoryModel;