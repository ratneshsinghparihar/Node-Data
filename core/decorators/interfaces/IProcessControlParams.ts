﻿export interface IProcessControlParams {
    indexofArgumentForTargetObjectId?: number,
    type: string,
    action: string,
    indexofArgumentForTargetObject?: number,
    executeInWorker?: boolean,
    executeInDistributedWorker?: boolean,
    notify?: boolean
}   