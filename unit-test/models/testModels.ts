import {Types} from 'mongoose';

export class student {
    _id: Types.ObjectId;
    name: string;
    addresses: Array<string>;
    subjects: Array<subject>;
}

export class subject {
    _id: string;
    name: string;
}

export class teacher {
    _id: string;
    name: string;
}

export class division {
    _id: string;
    name: string;
    students: Array<student>;
}