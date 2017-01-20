
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
