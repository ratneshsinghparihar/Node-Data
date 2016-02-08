var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Mongoose = require("mongoose");
var schema = Mongoose.Schema;
var ApiGenerator = (function () {
    function ApiGenerator() {
    }
    ApiGenerator.init = function (app) {
        function entity() {
            var names = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                names[_i - 0] = arguments[_i];
            }
            var newConstructor = function () {
            };
            var objSchema = new schema({}, { strict: false });
            var Obj = Mongoose.model(names[0], objSchema);
            app.get("/" + names[0] + "/all", function (req, res) {
                console.log("Request Recieved");
                Obj.find({}, function (err, docs) {
                    if (err) {
                        res.status(500).send("Internal Server Error");
                    }
                    else {
                        res.set("Content-Type", "application/json");
                        res.status(200).send(docs);
                    }
                });
            });
            app.post("/" + names[0] + "/add", function (req, res) {
                var o = req.body;
                Obj.create(o, function (err, d) {
                    if (err) {
                        console.log("Error Occurred");
                        console.log(err);
                        console.log("----------------------------------------------------------");
                        res.status(500).send("Internal Server Error");
                    }
                    else {
                        res.status(200).send("");
                    }
                });
            });
            return newConstructor;
        }
        var Furnitures = (function () {
            function Furnitures() {
            }
            Furnitures = __decorate([
                entity("furnitures"), 
                __metadata('design:paramtypes', [])
            ], Furnitures);
            return Furnitures;
        })();
        var Cutleries = (function () {
            function Cutleries() {
            }
            Cutleries = __decorate([
                entity("cutlery"), 
                __metadata('design:paramtypes', [])
            ], Cutleries);
            return Cutleries;
        })();
        var Birds = (function () {
            function Birds() {
            }
            Birds = __decorate([
                entity("birds"), 
                __metadata('design:paramtypes', [])
            ], Birds);
            return Birds;
        })();
        var Animals = (function () {
            function Animals() {
            }
            Animals = __decorate([
                entity("animals"), 
                __metadata('design:paramtypes', [])
            ], Animals);
            return Animals;
        })();
    };
    return ApiGenerator;
})();
module.exports = ApiGenerator;
