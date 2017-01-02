export interface WorkerParams {
    workerName: string,
    serviceName: string,
    servicemethodName: string,
    arguments?: [any],
    principalContext?: any
}