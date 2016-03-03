import {service, inject} from '../decorators';

@service()
export class ASuccess {
    constructor() {
    }
}

@service()
export class BSuccess {
    constructor( @inject() a: ASuccess) {
    }
}

@service()
export class CSuccess {
    constructor( @inject() a: ASuccess, @inject() b: BSuccess) {
    }
}

@service()
export class DSuccess {
    @inject()
    private c1: CSuccess;

    constructor( @inject() a: ASuccess, @inject() b: BSuccess, @inject() c: CSuccess) {
    }
}

@service()
export class ESuccess {
    constructor( @inject() private a: ASuccess, @inject() private b: BSuccess, @inject() private c: CSuccess, @inject() d: DSuccess) {
    }
}