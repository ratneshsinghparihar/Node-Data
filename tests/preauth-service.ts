import {service} from "../di/decorators";

@service({ singleton: false, serviceName:'preauthservice'})
export class PreauthService {

    CanEdit(id: any, entity: any) {
        console.log('CanEdit is called');
        return true;
    }

    CanEditWithParams(id: any, entity: any, val: boolean) {
        console.log('CanEdit is called');
        return val;
    }
}

export default PreauthService;