// import * as Express from "express";
// import UserService = require("../services/userService");
// import IUser = require("../models/user");
// class UserController{
//   static addUser(req : Express.Request, res : Express.Response){
//     var user = req.body;
//     //return;
//     console.log(user);
//     var promise = UserService.addUser(user );//, (err, user)=>{
//     promise.then((model)=>{
//       res.set("Content-Type", "application/json");
//       res.status(200).send(model);
//     })
//     .error(err=>{
//       res.status(500).send("Internal Server Error");
//     });
//   }
//   static init(app: Express.Application){
//     app.get("/users/all", UserController.getAllUsers);
//     app.post("/users/add", UserController.addUser);
//   }
//   static getAllUsers(req : Express.Request, res : Express.Response){
//     UserService
//       .getAllUsers()
//       .then(users=>{
//         res.set("Content-Type", "application/json");
//         res.status(200).send(users);
//       })
//       .error((err)=>{
//         res.status(500).send("Internal Server Error");
//       });
//   }
// }
// export = UserController;
