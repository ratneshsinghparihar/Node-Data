import * as DI from './di'
import {repositoryMap} from '../core/exports'
import {ClassType} from '../core/utils/classtype';

let repoSource = function (target: ClassType<any>) {
    let repo;
    if (!target) {
        return null;
    }
    Object.keys(repositoryMap())
        .forEach(x => {
            // TODO: Decide repository map will hold the prototype or the function
            if (repositoryMap()[x].fn === target || (<Function>repositoryMap()[x].fn).prototype === target) {
                repo = repositoryMap()[x].repo;
            }
        });
}

DI.Container.addSource(repoSource);

export let Container: DI.IContainer = DI.Container;