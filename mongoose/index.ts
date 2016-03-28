
import {MongooseService} from './mongoose-service';

export var entityServiceInst = new MongooseService();
export {generateSchema, pathRepoMap} from './schema';
export {connect} from './db';
