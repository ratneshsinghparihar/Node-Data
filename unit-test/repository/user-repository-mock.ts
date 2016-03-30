export class UserRepositoryMock {

    findByName() {
    }

    findByField(field: string, value: string) {
        var userObject = {
            "_id": "56b07218fc2e4f4427e9ff8f",
            "name": "pratikv1",
            "email": "abc11@xyz.com",
            "age": 30,
            "password": "dsfs",
            "roles": {
                "_id": "56b07218fc2e4f4427e9ff8f",
                "name": "admin"
            },
            "rolenames": "ROLE_ADMIN,ROLE_USER",
            "__v": 0,
            "refreshToken": "56b07218fc2e4f4427e9ff8f.b97bd654e5a6603ca442c8bfb6185a017d4b66a96f3aebb3a92d384dda5e95c88830ca7e157557ce",
            "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjU2YjA3MjE4ZmMyZTRmNDQyN2U5ZmY4ZiIsImlhdCI6MTQ1NjgzMzUxNSwiZXhwIjoxNDU2ODMzNjM1fQ.WMYbdJeCBfj_t-_Tk94ys5K6LGCIW0pfmhitdC-Hs_U",
        }
        return userObject;
    }

    public getModelRepo() {
        return true;
    }
}
