export declare class SecurityConfig {
    static ResourceAccess: any;
    static tokenSecretkey: string;
    static tokenExpiresInMinutes: number;
    static issuer: string;
    static audience: string;
}
export declare enum AccessMask {
    view = 1,
    edit = 2,
    delete = 4,
    approve = 8,
}
export declare enum RoleEnum {
    ROLE_ADMIN = 1,
    ROLE_USER = 2,
    ROLE_AUTHOR = 3,
    ROLE_PUBLISHER = 4,
}
export declare enum AuthenticationType {
    passwordBased = 1,
    TokenBased = 2,
}
export declare enum AuthenticationEnabled {
    disabled = 1,
    enabledWithoutAuthorization = 2,
    enabledWithAuthorization = 3,
}
