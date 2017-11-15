//This is default behaviour of the methods.It will be overridden at run time.
export function ensureLoggedIn() {
    return function (req, res, next) {
        next();
    }
}

export function isAuthorize(req: any, repository: any, invokedFunction?: string): boolean {
    return true;
}


export function getContextObjectFromSession(sessionObj: any) {
    return {};
}

export function updateSession(inObj: any, curSession: any) {
    return new Promise((resolve, reject) => {
        resolve(true);
    })
}

export function getSession(query: any) {
    return new Promise((resolve, reject) => {
        resolve({});
    })
}

export function getSessionLastTimeStampForChannel(query: any, channel: string, curSession?: any) {
    return new Promise((resolve, reject) => {
        resolve(new Date());
    })
}