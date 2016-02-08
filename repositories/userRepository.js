// /// <reference path="../typings/tsd.d.ts"/>
// import * as mongoose from "mongoose";
// import Config = require( "../config" );
// import User = require("../schema/userSchema");
// import {IUser} from '../models/user.ts';
// mongoose.connect(Config.DbConnection);
// class userRepository{
//   static addUser(user : IUser, cb : Function){
//     User.create(user, (err,model)=>{
//       if(err){
//         cb(err,null);
//       }
//       else{
//         cb(null, model);
//       }
//     });
//   }
//   static getAllUsers(cb : Function) :  any {
//     User.find({},(err,models)=>{
//       if(err){
//         cb(err, null);
//       }
//       else{
//         cb(null,models);
//       }
//     });
//   }
// }
// export = userRepository;
// // findone , findall , save baseInterface
// // interface , baseInterFace ()
