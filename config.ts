
export class Config {
    public static DbConnection: string = "mongodb://localhost:27017/userDatabase";
    public static basePath: string = "data";
    public static apiversion: string = "v1"

}

export class Security {
    public static isAutheticationEnabled: boolean = true;
    public static isAuthorizationEnabled: boolean = false;
    public static isAutheticationByUserPasswd: boolean = true;
    public static isAutheticationByToken: boolean = false;
}
