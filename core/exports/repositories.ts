import {IDynamicRepository, DynamicRepository} from '../dynamic/dynamic-repository';

var _repositoryMap: { [key: string]: { fn: Object, repo: IDynamicRepository } } = {};

export function repositoryMap(repositoryMap?: any): { [key: string]: { fn: Object, repo: IDynamicRepository } }  {
    if (repositoryMap !== undefined) {
        _repositoryMap = repositoryMap;
    }
    return _repositoryMap;
}