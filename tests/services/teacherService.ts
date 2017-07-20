import {inject, injectbyname} from '../../di/decorators/inject';
import {service} from '../../di/decorators/service';
import * as teacherRepository from '../repositories/teacherRepository';
import {Worker, processStartEnd} from '../../core/decorators';
import {teacher} from '../models/teacher';
import Q = require('q');

@service({ singleton: true, serviceName: 'teacherService' })
export class TeacherService {
    @inject(teacherRepository)
    private _teacherRepository: teacherRepository.TeacherRepository;

    @Worker()
    addTeacherWorker(obj: teacher) {
        return this._teacherRepository.post(obj);
    }

    @processStartEnd({ type: 'teacher', action: 'update', indexofArgumentForTargetObject: 0})
    addTeacherProcessControl(obj: teacher) {
        return this._teacherRepository.post(obj);
    }

    @processStartEnd({ type: 'teacher', action: 'update', indexofArgumentForTargetObject: 0, executeInWorker: true })
    addTeacherProcessControlAndWorker(obj: teacher) {
        return this._teacherRepository.post(obj);
    }

    @processStartEnd({ type: 'teacher', action: 'update', indexofArgumentForTargetObject: 0, executeInWorker: true })
    longTask() {
        let prom = new Promise(
            (resolve, reject) => {
                let asyncCall = setTimeout(() => {
                    resolve("fg");
                }, 5000)
            }
        );

       return prom.then(s => {
            return s;
        });

        
    }
}

export default TeacherService;

