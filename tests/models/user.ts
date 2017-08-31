

export interface IUser{
   _id: string;
  name : string;
  email : string;
  password : string;
  age : string;
  roles: any;

  /**
   * used to set a context to fetch data from db with respect to given viewContext.
   * use case: if you do not interested to run acl/security logic in your entity then set this as databse_context
   * and write its logic by pass security and fetch all db data objects.
  */
  viewContext: number;

   /**
   * internal use for caching
   */
  cacheContext: number;
  entityCache: any;
};


