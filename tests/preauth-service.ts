import {service} from "../di/decorators";

@service({ singleton: false, serviceName:'preauthservice'})
export class PreauthService {

    CanEdit(entity: any) {
        console.log('CanEdit is called');
        return entity.allow;
    }

    CanEditWithParams(entity: any) {
        console.log('CanEditWithParams is called');
        return entity.allow;
    }
}

export default PreauthService;