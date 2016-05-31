
import {MongooseService} from './mongoose-service';

export var entityServiceInst = new MongooseService();
export {generateSchema} from './schema';
export {connect} from './db';
