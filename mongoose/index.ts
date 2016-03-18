
import {MongooseService} from './mongoose-service';

export var entityServiceInst = new MongooseService();
export {generateSchema, pathRepoMap, getEntity, getModel} from './schema';
export {connect} from './db';
