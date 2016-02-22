
export class SecurityConfig{
  public static ResourceAccess : any=[{
                                        "name":"blogs",
                                        "acl" :[{"role":"ROLE_ADMIN","accessmask":7},
                                                 {"role":"ROLE_USER","accessmask":1},
                                                 {"role":"ROLE_AUTHOR","accessmask":7}
                                                ]                                          
                                        },
                                         {"name":"comment",
                                         "acl" :[{"role":"ROLE_ADMIN","accessmask":7},
                                                 {"role":"ROLE_USER","accessmask":7},
                                                 {"role":"ROLE_AUTHOR","accessmask":7}
                                                ]  
                                         }];
public static secretkey : string= 'ericthered';
public static issuer:string = "accounts.examplesoft.com";
public static audience:string = "yoursite.net";                                        
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
    }