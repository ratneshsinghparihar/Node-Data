
export class Decorators {
    public static DOCUMENT = 'document';
    public static FIELD = 'field';
    public static INJECT = 'inject';
    public static INJECTBYNAME = 'injectbyname';
    public static MANYTOMANY = 'manytomany';
    public static MANYTOONE = 'manytoone';
    public static ONETOMANY = 'onetomany';
    public static ONETOONE = 'onetoone';
    public static REPOSITORY = 'repository';
    public static SERVICE = 'service';
    public static AUTHORIZE = 'authorize';
    public static PREAUTHORIZE = 'preauthorize';
    public static JSONIGNORE = 'jsonignore';
    public static REQUIRED = 'required';
}

export var RelationDecorators: Array<string> = [Decorators.ONETOONE, Decorators.ONETOMANY, Decorators.MANYTOONE, Decorators.MANYTOMANY];