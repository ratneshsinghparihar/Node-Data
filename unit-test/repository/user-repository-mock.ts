import Q = require('q');
export class UserRepositoryMock {

    findByName() {
    }

    findByField(field: string, value: string): Q.Promise<any> {
        return Q.fcall(() => {
            var userObject = {
                "_id": "56b07218fc2e4f4427e9ff8f",
                "name": "pratikv1",
                "email": "abc11@xyz.com",
                "age": 30,
                "password": "dsfs",
                "__v": 0,
                "refreshToken": "56b07218fc2e4f4427e9ff8f.b97bd654e5a6603ca442c8bfb6185a017d4b66a96f3aebb3a92d384dda5e95c88830ca7e157557ce",
                "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjU2YjA3MjE4ZmMyZTRmNDQyN2U5ZmY4ZiIsImlhdCI6MTQ1NjgzMzUxNSwiZXhwIjoxNDU2ODMzNjM1fQ.WMYbdJeCBfj_t-_Tk94ys5K6LGCIW0pfmhitdC-Hs_U",
                "id": "56b07218fc2e4f4427e9ff8f",
                "roles": [
                    {
                        "__v": 0,
                        "name": "ROLE_ADMIN",
                        "_id": "56ea7d4379be4a40221380a4"
                    },
                    {
                        "__v": 0,
                        "name": "ROLE_USER",
                        "_id": "56ea7d4b79be4a40221380a5"
                    }
                ]
            }
            return userObject;
        });
    }

    public getEntityType() {
        return this;
    }

    public put(a,b) {

    }

    getUser() {
        var userObject = {
            "_id": "56b07218fc2e4f4427e9ff8f",
            "name": "pratikv1",
            "email": "abc11@xyz.com",
            "age": 30,
            "password": "dsfs",
            "__v": 0,
            "refreshToken": "56b07218fc2e4f4427e9ff8f.b97bd654e5a6603ca442c8bfb6185a017d4b66a96f3aebb3a92d384dda5e95c88830ca7e157557ce",
            "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjU2YjA3MjE4ZmMyZTRmNDQyN2U5ZmY4ZiIsImlhdCI6MTQ1NjgzMzUxNSwiZXhwIjoxNDU2ODMzNjM1fQ.WMYbdJeCBfj_t-_Tk94ys5K6LGCIW0pfmhitdC-Hs_U",
            "id": "56b07218fc2e4f4427e9ff8f",
            "rolenames": "ROLE_ADMIN" ,
            "roles": [
                {
                    "__v": 0,
                    "name": "ROLE_ADMIN",
                    "_id": "56ea7d4379be4a40221380a4"
                },
                {
                    "__v": 0,
                    "name": "ROLE_USER",
                    "_id": "56ea7d4b79be4a40221380a5"
                }
            ]
        }
        return userObject;
    }
}
