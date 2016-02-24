
 export class Config{
  public static DbConnection : string= "mongodb://localhost:27017/userDatabase";
  
}

export class Security{
  public static isAutheticationEnabled : boolean= true;
  public static isAutheticationByUserPasswd:boolean =true;
  public static isAutheticationByToken:boolean =false;
}
