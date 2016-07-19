import {service} from "../di/decorators";
import {PrincipalContext} from "../security/auth/principalContext";

@service({ singleton: false, serviceName:'preauthservice'})
export class PreauthService {

    CanEdit(entity: any) {
        var user = PrincipalContext.User;
        console.log('CanEdit is called');
        return false;
    }

    CanEdit1() {
        var user = PrincipalContext.User;
        console.log('CanEdit is called');
        return true;
    }

    CanEditWithParams(entity: any) {
        console.log('CanEditWithParams is called');
        return entity.allow;
    }

    PostFilter(result: Array<any>) {
        return result;
    }
}

export default PreauthService;