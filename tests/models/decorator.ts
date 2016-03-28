import * as Express from "express";
import * as Mongoose from "mongoose";

var schema = Mongoose.Schema;

//class ApiGenerator{
//  static init = function(app : Express.Application){
//    function entity<TFunction extends Function>(...names:Array<string>): TFunction {
//      let newConstructor = function () {
//      };

//      var objSchema = new schema({},{strict:false});
//      var Obj = Mongoose.model<Mongoose.Document>(names[0],objSchema);
//      app.get("/"+names[0]+"/all", function(req : Express.Request, res : Express.Response){
//        console.log("Request Recieved");
//        Obj.find({}, (err,docs)=>{
//          if(err){
//            res.status(500).send("Internal Server Error");
//          }
//          else{
//            res.set("Content-Type", "application/json");
//            res.status(200).send(docs);
//          }
//        });
//      });

//      app.post("/"+names[0]+"/add", function(req : Express.Request, res : Express.Response){
//        var o = req.body;
//        Obj.create(o, (err,d)=>{
//          if(err){
//            console.log("Error Occurred");
//            console.log(err);
//            console.log("----------------------------------------------------------");
//            res.status(500).send("Internal Server Error");
//          }
//          else{
//            res.status(200).send("");
//          }
//        });
//      });

//      return <any> newConstructor;
//    }

//  @entity("furnitures")
//  class Furnitures{
//  }

//  @entity("cutlery")
//  class Cutleries{
//  }

//  @entity("birds")
//  class Birds{
//  }

//  @entity("animals")
//  class Animals{
//  }

//  }
//}
//export = ApiGenerator;
