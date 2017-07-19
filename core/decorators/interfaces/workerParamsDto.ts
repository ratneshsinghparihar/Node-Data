export class workerParamsDto {
    id: any;
    serviceName: string;
    servicemethodName: string;
    arguments: [any];
    principalContext: any;
    processId: number;
    initialize: boolean;
    status: string;
    message: string;
    result: any;
}