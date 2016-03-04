
export class SecurityConfig {
    public static ResourceAccess: any = [{
        "name": "blogs",
        "acl": [{ "role": "ROLE_ADMIN", "accessmask": 7 },
            { "role": "ROLE_USER", "accessmask": 1 },
            { "role": "ROLE_AUTHOR", "accessmask": 7 }
        ]
    },
        {
            "name": "comment",
            "acl": [{ "role": "ROLE_ADMIN", "accessmask": 7 },
                { "role": "ROLE_USER", "accessmask": 7 },
                { "role": "ROLE_AUTHOR", "accessmask": 7 }
            ]
        }];
    public static tokenSecretkey: string = 'ericthered';
    public static tokenExpiresInMinutes: number = 2;//2 months

    public static issuer: string = "accounts.examplesoft.com";
    public static audience: string = "yoursite.net";
}


export enum AccessMask {
    view = 1,
    edit = 2,
    delete = 4,
    approve = 8
};

export enum RoleEnum {
    ROLE_ADMIN = 1,
    ROLE_USER,
    ROLE_AUTHOR,
    ROLE_PUBLISHER
};

export enum AuthenticationType {
    passwordBased = 1,
    TokenBased = 2
};

export enum AuthenticationEnabled {
    disabled = 1,
    enabledWithoutAuthorization = 2,
    enabledWithAuthorization = 3
};
