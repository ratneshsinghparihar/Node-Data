import {inject, injectbyname} from '../../di/decorators/inject';
import {service} from '../../di/decorators/service';
import * as teacherRepository from '../repositories/teacherRepository';
import {Worker, processStartEnd} from '../../core/decorators';
import {teacher} from '../models/teacher';
import Q = require('q');

@service({ singleton: true, serviceName: 'authorizationService' })
export class TeacherService {
    @inject(teacherRepository)
    private _teacherRepository: teacherRepository.TeacherRepository;

    @Worker()
    addTeacher(obj: teacher) {
        return this._teacherRepository.post(obj);
    }

    @processStartEnd({ type: 'teacher', action: 'update', indexofArgumentForTargetObjectId: 0})
    updateTeacher(id: string, obj: teacher) {
        return this._teacherRepository.put(id, obj);
    }

    @processStartEnd({ type: 'teacher', action: 'update', indexofArgumentForTargetObjectId: 0, executeInWorker: true })
    updateTeacherOnWorker(id: string, obj: teacher) {
        return this._teacherRepository.put(id, obj);
    }
}

export default TeacherService;

