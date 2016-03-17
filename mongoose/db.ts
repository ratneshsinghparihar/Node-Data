import Mongoose = require("mongoose");
import * as CoreUtils from '../core/utils';

export function connect() {
    Mongoose.connect(CoreUtils.config().Config.DbConnection);
}