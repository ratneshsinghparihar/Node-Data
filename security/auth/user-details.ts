export interface UserDetails {
    getAuthorities(): Array<any>;

    getPassword(): string;

    getUsername(): string;

    isAccountNonExpired(): boolean;

    isAccountNonLocked(): boolean;

    isCredentialsNonExpired(): boolean;

    isEnabled(): boolean;

    getUserObject(): any;
}