// var request = require("request");
// var base_url = "http://localhost:23548/data/users";

<<<<<<< HEAD
// describe("GET Server", function(){
//     describe("GET /users", function() {
//          it("returns status code 200", function() {
//              request.get(base_url, function(error, response, body) {
//                  expect(response.statusCode).toBe(402);
//                  done();
//              });
//         });
//     });
// });
=======
describe("GET Server", function(){
    describe("GET /users", function() {
         it("returns status code 200", function(done) {
             request.get(base_url, function(error, response, body) {
                 expect(response.statusCode).toBe(402);
                 done();
             });
        });
    });
});
>>>>>>> 91b7d446bc6afca4f600cd3b80e6a69f3f523e23
