import {Types} from 'mongoose';
import {field, document} from '../mongoose/decorators';
import {Strict} from '../mongoose/enums/';
import {onetomany, manytoone, manytomany, onetoone} from '../core/decorators';

//@document({ name: "session", strict: Strict.false })
export class Session {

    @field()
    sessionId: string;

    @field()
    userName: string;

    @field()
    role: string;

    @field()
    userId: number;

    
    reliableChannles: any;//format { "order": { "status":true,lastemit:date} }


}

export default Session;
/*
db.sessions.insert([{
"sessionId":"first1",
"role":"ROLE_USER",
"userName":"Ratnesh"
},
{
"sessionId":"session_for_ordermatcher",
"role":"ROLE_ADMIN",
"userName":"OrderMatcher"
},
{
"sessionId":"session_admin",
"role":"ROLE_ADMIN",
"userName":"session_admin"
}
]
)

*/