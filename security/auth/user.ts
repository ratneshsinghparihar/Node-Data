import {UserDetails} from './user-details';
export class User implements UserDetails {
    private password: string;
    private username: string;
    private authorities: Array<any>;
    private accountNonExpired: boolean;
    private accountNonLocked: boolean;
    private credentialsNonExpired: boolean;
    private enabled: boolean;
    private userObject: any;
    private dbName: string;

    public constructor(username: string, password: string, user: any, authorities?: Array<any>, dbName?: string) {
        this.setUser(username, password, true, true, true, true, authorities);
        this.userObject = user;
    }

    public setUser(username: string, password: string,
        enabled: boolean, accountNonExpired: boolean,
        credentialsNonExpired: boolean, accountNonLocked: boolean,
        authorities: Array<any>,dbName?: string) {
        if (username != null && username != "" && password != null) {
            this.username = username;
            this.password = password;
            this.enabled = enabled;
            this.accountNonExpired = accountNonExpired;
            this.credentialsNonExpired = credentialsNonExpired;
            this.accountNonLocked = accountNonLocked;
            this.authorities = authorities;
            this.dbName = dbName;
        } else {
            throw "Cannot pass null or empty values to constructor";
        }
    }

    getAuthorities(): Array<any> {
        return this.authorities;
    };

    getPassword(): string {
        return this.password;
    };

    getDbName(): string {
        return this.dbName;
    };

    getUsername(): string {
        return this.username;
    };

    isAccountNonExpired(): boolean {
        return this.accountNonExpired;
    };

    isAccountNonLocked(): boolean {
        return this.accountNonLocked;
    };

    isCredentialsNonExpired(): boolean {
        return this.credentialsNonExpired;
    };

    isEnabled(): boolean {
        return this.enabled;
    };

    eraseCredentials() {
        this.password = null;
    }

    getUserObject(): any {
        return this.userObject;
    };
}