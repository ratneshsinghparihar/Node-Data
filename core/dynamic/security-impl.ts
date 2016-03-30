//This is default behaviour of the methods.It will be overridden at run time.
export function ensureLoggedIn() {
    return function (req, res, next) {
        next();
    }
}

export function isAuthorize(req: any, repository: any, invokedFunction?: string): boolean {
    return true;
}
