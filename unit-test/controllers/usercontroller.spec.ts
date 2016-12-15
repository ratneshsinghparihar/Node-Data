var request = require("request");
var base_url = "http://localhost:23548/data/users";

describe("GET Server", function(){
    describe("GET /users", function() {
         it("returns status code 200", function() {
             request.get(base_url, function(error, response, body) {
                 expect(response.statusCode).toBe(402);
                 done();
             });
        });
    });
});