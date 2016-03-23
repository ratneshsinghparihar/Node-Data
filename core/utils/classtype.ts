export interface ClassType<T> {
    new (...args: Array<any>): T;
}
