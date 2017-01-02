//var request = require("request");
//var base_url = "http://localhost:23548/data/users";
//import {UserDetailService} from '../security/auth/user-detail-service';
require('reflect-metadata/reflect');
import {blogServiceImpl}  from '../../unit-test/services/blogServiceImpl';
import fs = require('fs');
import * as Config from "../../config";
import * as configUtil from '../utils';
import {PrincipalContext} from '../../security/auth/principalContext';


describe("Worker Tests", function() {
  var blogContent: string;
  var principalContent: string;
  var fileContent: string = "Hello";
  var filePath="unit-test/OutputFiles/file.txt";
  var filePath1="unit-test/OutputFiles/file1.txt";

beforeEach(function() { 
PrincipalContext.getSession().run(function(){
      console.log("*****************************************")
      configUtil.config(Config);        
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
   });
});
   
describe(" Running for blogContent verification: ", function() { 
beforeEach(function(done) {
PrincipalContext.getSession().run(function(){

      fs.exists(filePath,function(exists) {
      console.log("Before Each fs.exists(filePath): "+ exists);
          if (exists) {
                console.log("removing existing files:");
                fs.unlink(filePath);
          } else {
                console.log("File doesn't exist");
          }
       });


      var blogService= new blogServiceImpl();
      blogService.writeBlog(filePath,fileContent);
      setTimeout(function() {
      fs.exists(filePath,function(exists) {
          if (exists) {
                console.log("File Found. ")
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
});

it(" Blog Content should match with the sent content.", function(done) {
PrincipalContext.getSession().run(function(){
      expect(blogContent==fileContent).toBeTruthy();
      done();
});
  });

});


describe(" Running for application context verification: ", function() { 
beforeEach(function(done) {
PrincipalContext.getSession().run(function(){

       fs.exists(filePath1,function(exists) {
      console.log("Before Each fs.exists(filePath): "+ exists);
          if (exists) {
                console.log("removing existing files:");
                fs.unlink(filePath1);
          } else {
                console.log("File doesn't exist");
          }
       });

      var blogService= new blogServiceImpl();
      blogService.checkApplicationContext(filePath1);
      setTimeout(function() {
      fs.exists(filePath1,function(exists) {
          if (exists) {
                console.log("File Found. ")
                        fs.readFile(filePath1, 'utf8', function ( err,data) {
                        if (err) {
                              console.log("Error while reading file: "+err);
                              principalContent=null;;
                              done();
                        }else{
                        principalContent=data;
                        console.log("Value in Principal Context: "+principalContent);
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
});

it(" Application Context should have information.", function(done) {
      var fileContent="unit-test/OutputFiles/file1.txt";
PrincipalContext.getSession().run(function(){
      console.log("Application Context Session: "+ JSON.stringify(PrincipalContext.getSession()));
      expect(principalContent==fileContent).toBeTruthy();
      done();
      });
  });

 });


});