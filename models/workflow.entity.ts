import {field, document} from '../mongoose/decorators';
import {jsonignore} from '../core/decorators';
import {SecurableEntity} from './securable.entity';
import {Types} from 'mongoose';

export class WorkFlowEntity extends SecurableEntity {

    @field()
    status: String;

    @field()
    previuosStatus: String;

    @field({ itemType: Object })
    approvalStatusRoleWise: Array<Object>;

    @field()
    approvalStatus: String;

}

export default WorkFlowEntity;