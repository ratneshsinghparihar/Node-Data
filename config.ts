export class Config {
    public static DbConnection: string = "mongodb://localhost:27017/userDatabase";
    public static basePath: string = "data";
    public static apiversion: string = "v1";

    public static ElasticSearchConnection : string  = "http://localhost:9200";
    public static ApplyElasticSearch : boolean = false;
}

export class Security {
    public static isAutheticationEnabled = "disabled";//allowed values: "disabled","enabledWithoutAuthorization","enabledWithAuthorization"
    public static authenticationType = "passwordBased";//allowed values: "passwordBased","TokenBased"
}

export class facebookAuth {
    public static clientID = '11';// your App ID
    public static clientSecret = 'aa';// your App Secret
    public static callbackURL = 'http://localhost:23548/auth/facebook/callback';
}

