
export class Decorators {
    public static DOCUMENT = 'document';
    public static ENTITY = 'entity';
    public static FIELD = 'field';
    public static COLUMN = 'column';
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
    public static POSTFILTER = 'postfilter';
    public static UPLOAD = 'upload';
    public static JSONIGNORE = 'jsonignore';
    public static REQUIRED = 'required';
    public static TRANSIENT = 'transient';
    public static ALLOWANONYMOUS = 'allowanonymous';
    public static WORKER = 'worker';
    public static OPTIMISTICLOCK = 'OptimisticLocking';
    public static PROMISABLE = 'Promisable';
    public static PROCESS_START = 'processStart';
    public static PROCESS_END = 'processEnd';
    public static PROCESS_START_AND_END = 'processStartEnd';
}

export enum ExportTypes {

    NONE = 0,
    REST = 1,
    WS = 2,
    WS_BROAD_CAST = 4,
    PUB_SUB = 8,
    ALL = 15,


}

export var RelationDecorators: Array<string> = [Decorators.ONETOONE, Decorators.ONETOMANY, Decorators.MANYTOONE, Decorators.MANYTOMANY];