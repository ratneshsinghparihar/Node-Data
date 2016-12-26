//var request = require("request");
//var base_url = "http://localhost:23548/data/users";
//import {UserDetailService} from '../security/auth/user-detail-service';
require('reflect-metadata/reflect');
import {blogServiceImpl}  from '../../unit-test/services/blogServiceImpl';
import fs = require('fs');
import * as Config from "../../config";
import * as configUtil from '../utils';

describe("Worker Tests", function() {
  var blogContent: string;
  var fileContent: string = "Hello";
  var filePath="unit-test/OutputFiles/file.txt";
  beforeEach(function() { 
        console.log("*****************************************")
        console.log("*****************************************")
      configUtil.config(Config);        
     jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
     fs.exists(filePath,function(exists) {
     console.log("Before Each fs.exists(filePath): "+ exists);
          if (exists) {
                console.log("removing existing files:");
                fs.unlink(filePath);
          } else {
                console.log("File doesn't exist");
          }
       });
     });
   
  describe(" Running for blogContent verification: ", function() { 
    beforeEach(function(done) {
      var blogService= new blogServiceImpl();
      blogService.writeBlog(filePath,fileContent);
      setTimeout(function() {
      fs.exists(filePath,function(exists) {
      //console.log("Before Each fs.exists(filePath): "+ exists);
          if (exists) {
                console.log("FIle Found. ")
                        fs.readFile(filePath, 'utf8', function ( err,data) {
                        if (err) {
                              console.log("Error while reading file: "+err);
                              blogContent=null;;
                              done();
                        }else{
                        blogContent=data;
                        console.log("Blog Content: "+blogContent);
                        done();
                        }
                  });
          } else {
                console.log("FIle doesn't exist. ")
                done();
          }
       });
      }, 5000);
    });

    it(" Blog Content should match with the sent content.", function(done) { 
      expect(blogContent==fileContent).toBeTruthy();
      done();
     });
    });
  });




      //   if(!fs.exists(filePath)){
        
      //   // fs.readFile(filePath, 'utf8', function ( err,data) {
      //   //       if (err) {
      //   //           console.log("Error while reading file: "+err);
      //   //           blogContent=null;;
      //   //           done();
      //   //       }else{
      //   //         blogContent=data;
      //   //         console.log("Blog Content: "+blogContent);
      //   //         done();
      //   //       }
      //   // });
      //   blogContent="Hello";
      // }else{
      //   blogContent="";
      //   console.log("Executing test case :2, FIle doesn't exist. ")
      //   done();
      // }

      



//var async = new AsyncSpec(this);


// describe("Worker Test:::: ", function(){
//   // beforeEach(()=>{
//   //   jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
//   // });
//   jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
//   describe("blog details: ", function() {
//     var filePath="/Users/asishs/Projects/Node-Data/Enhancement_On_Node_Data/Node-Data/spec/OutputFiles/file.txt";
//     console.log("Running Test Cases:::::");
//      var blogContent: string;
//         // beforeEach((done)=>{
//         //    if(!fs.exists(filePath)){
//         //      console.log("removing existing files:");
//         //      //fs.unlink(filePath);
//         //      //fs.writeFile(filePath,"Hello");
//         //      //console.log("now removing file");
//         //     fs.unlink(filePath);
//         //    }
//         //       var blogService= new blogServiceImpl();
//         //       blogService.writeBlog(filePath,"Hello");
//         //      setTimeout(function(){
//         //        console.log('executing test');
//         //          if(fs.exists(filePath)){
//         //            console.log('file exists');
//         //            blogContent = "Hello";
//         //           // fs.readFile(filePath, 'utf8', function ( err,data) {
//         //           //       if (err) {
//         //           //         return console.log(" Error: "+err);
//         //           //       }else{
//         //           //       blogContent=data;
//         //           //       console.log("Blog Content: "+blogContent);
//         //           //    }
//         //           //    done();
//         //           // });
//         //          }
//         //          done();
//         //     },5000);
//         //    });

//         //  it("read file content", (done)=> {
//         //    console.log('executing tests for blogContent '+ blogContent);
//         //     expect(blogContent).toBe("Hello1");
//         //     done();
//         //  });

//          it("new it",()=>{
//            runs(()=>{
//              if(!fs.exists(filePath)){
//              console.log("removing existing files:");
//              //fs.unlink(filePath);
//              //fs.writeFile(filePath,"Hello");
//              //console.log("now removing file");
//             fs.unlink(filePath);
//            }
//           //    var blogService= new blogServiceImpl();
//           //    blogService.writeBlog(filePath,"Hello");
//            })

//            waitsFor(function(){
//              console.log('wait for is called');
//              if(fs.exists(filePath)){
//                    console.log('file exists');
//                    blogContent = "Hello";
//                    return true;
//              }
//               return false;
//            },"name",3000);

//            runs(function(){
//              console.log('executing tests for blogContent '+ blogContent);
//             expect(blogContent).toBe("Hello1");
//            });
//          });
         
      
//             // if (blog != null || blog != undefined) {
//             //      console.log("blog found with name: "+ JSON.stringify(blog));
//             //      expect(blog).toBe("john");
//             //      done();
//             // }
//             // else{
//             //      console.log("failure: blog not found ");
//             //      done();
//             // }
       
            
//          });
//     });

// describe("Worker Test:::: ", function(){
//   describe("blog details: ", function() {
//          it("returns user name", function(done) {
//             console.log("Running Test Cases:::::");    
//             var currentUserDetailService = new CurrentUserDetailService();
//             var foundUser=currentUserDetailService.getTestUser("john");
//             if (foundUser != null || foundUser != undefined) {
//                  console.log("user found with name: "+ JSON.stringify(foundUser));
//                  expect(foundUser).toBe("john");
//                  done();
//             }
//             else{
//                  console.log("failure: User not found ");
//                  done();
//             }
//          });
//     });
// });


// describe("Get User Details", function(){
//   describe("User Details`", function() {
//          it("returns user name", function(done) {
//             console.log("Running Test Cases:::::");    
//             var currentUserDetailService = new CurrentUserDetailService();
//             currentUserDetailService.loadUserByUsername("john").then((foundUser)=>{
//             if (foundUser != null || foundUser != undefined) {
//                  expect(foundUser.name).toBe("john");
//             }
//              else {
//                     console.log("failure: User not found ");
//                     done();
//                 }
//             },(error) => {
//                      console.log("failure: ", error);
//                      done();
//                 });
//         });
//     });
// });




// describe("GET Server", function(){
//   describe("GET /users", function() {
//          it("returns status code 200", function(done) {
//              request.get(base_url, function(error, response, body) {
//                  console.log("error "+error + "response: "+response + "body: "+body);
//                  if(!error){
//                  console.log("No error found");
//                  expect(response.status.code).toBe(200);
//                 }else{
//                  console.log("failure ",error,response);
//                  done();
//                  }
//              });
//         });
//     });
// });
