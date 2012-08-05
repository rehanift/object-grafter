var chai = require("chai");
var expect = chai.expect;
var should = chai.should();
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
chai.use(sinonChai);

var load_object_grafter = function(context){
  var vm = require("vm");
  var fs = require("fs");

  var grafter_src = fs.readFileSync(__dirname + "/../index.js", "utf-8");
  vm.runInContext(grafter_src, context);
  return vm.runInContext("ObjectGrafter.create()", context);
};

describe("Object Grafter", function(){
  beforeEach(function(){
    var vm = require("vm");
    this.client_context = vm.createContext();
    this.client_builtin_objects = {
      "Array": vm.runInContext("Array", this.client_context),
      "Date": vm.runInContext("Date", this.client_context),
      "Error": vm.runInContext("Error", this.client_context),
      "RegExp": vm.runInContext("RegExp", this.client_context),
      "Object": vm.runInContext("Object", this.client_context),
      "Function": vm.runInContext("Function", this.client_context)
    };
    this.grafter = load_object_grafter(this.client_context);

    this.grafter.set_host_builtin_objects({
      "Array": Array,
      "Date" : Date,
      "Error" : Error,
      "RegExp" : RegExp,
      "Object" : Object
    });
  });
  
  describe("Built-in Object Constructors", function(){
    it("grafts an Array constructor from one context to another", function(){
      var array_constructor = Array;
      var grafted = this.grafter.graft(array_constructor);
      expect(grafted).to.equal(this.client_builtin_objects["Array"]);
    });

    it("grafts an Date constructor from one context to another", function(){
      var date_constructor = Date;
      var grafted = this.grafter.graft(date_constructor);
      expect(grafted).to.equal(this.client_builtin_objects["Date"]);
    });

    it("grafts an Error constructor from one context to another", function(){
      var error_constructor = Error;
      var grafted = this.grafter.graft(error_constructor);
      expect(grafted).to.equal(this.client_builtin_objects["Error"]);
    });

    it("grafts an RegExp constructor from one context to another", function(){
      var regexp_constructor = RegExp;
      var grafted = this.grafter.graft(regexp_constructor);
      expect(grafted).to.equal(this.client_builtin_objects["RegExp"]);
    });
    
    it("grafts an Object constructor from one context to another", function(){
      var object_constructor = Object;
      var grafted = this.grafter.graft(object_constructor);
      expect(grafted).to.equal(this.client_builtin_objects["Object"]);
    });

    it("grafts 'null' from one context to another", function(){
      var grafted = this.grafter.graft(null);
      expect(grafted).to.equal(null);      
    });
  });

  describe("Functions", function(){
    it("grafts a Function object", function(){
      var host_function = function(){};

      var grafted = this.grafter.graft(host_function);
      expect(grafted.constructor).to.equal(this.client_builtin_objects["Function"]);
    });

    it("calls the host function", function(){
      var spy = sinon.spy();
      var host_function = function(){
        spy();
      };

      var grafted = this.grafter.graft(host_function);
      grafted();
      spy.should.have.been.calledWith();
    });

    it("grafts return values", function(){
      var host_function = function(){
        var host_date = new Date();
        return host_date;
      };

      var grafted = this.grafter.graft(host_function);
      var return_value = grafted();
      expect(return_value.constructor).to.equal(this.client_builtin_objects["Date"]);
    });
  });

  describe("Built-in Object Instances", function(){

    it("grafts a RegExp object", function(){
      var host_regexp = new RegExp(".*");
      var grafted = this.grafter.graft(host_regexp);
      expect(grafted.constructor).to.equal(this.client_builtin_objects["RegExp"]);
    });

    it("grafts an Error object", function(){
      var host_error_object = new Error();
      var grafted = this.grafter.graft(host_error_object);
      expect(grafted.constructor).to.equal(this.client_builtin_objects["Error"]);
    });

    it("grafts an Object that inherits from another Object", function(){
      var host_parent_ctor = function(){ };
      host_parent_ctor.prototype.foo = function(){ return "foo"; };
      var host_child_ctor = function(){ };
      host_child_ctor.prototype = new host_parent_ctor();
      var host_child_object = new host_child_ctor();
      
      var grafted = this.grafter.graft(host_child_object);
      expect(grafted.foo.constructor).to.equal(this.client_builtin_objects["Function"]);

    });
    

    it("grafts a Date object", function(){
      var host_date_object = new Date();
      var grafted = this.grafter.graft(host_date_object);
      expect(grafted.constructor).to.equal(this.client_builtin_objects["Date"]);
      expect(grafted.toString()).to.eql(host_date_object.toString());
    });

    it("grafts an Array object", function(){
      var host_array_object = new Array(3);
      host_array_object[0] = "foo";
      host_array_object[1] = true;
      host_array_object[2] = 2;
      var grafted = this.grafter.graft(host_array_object);
      expect(grafted.constructor).to.equal(this.client_builtin_objects["Array"]);
      expect(grafted).to.eql(["foo",true,2]);
    });

    it("grafts generic objects", function(){
      var host_object = new Object();
      host_object.host_date = new Date();
      
      var grafted = this.grafter.graft(host_object);

      expect(grafted.constructor).to.equal(this.client_builtin_objects["Object"]);
      expect(grafted.host_date.constructor).to.equal(this.client_builtin_objects["Date"]);
    });
  });

  describe("Built-in Types", function(){
    it("grafts a number", function(){
      var host_number = 2;
      var grafted = this.grafter.graft(host_number);
      expect(grafted).to.eql(2);
    });

    it("grafts a boolean", function(){
      var host_boolean = true;
      var grafted = this.grafter.graft(host_boolean);
      expect(grafted).to.eql(true);
    });

    it("grafts a string", function(){
      var host_string = "foo";
      var grafted = this.grafter.graft(host_string);
      expect(grafted).to.eql("foo");
    });

    it("grafts undefined", function(){
      var host_undefined = undefined;
      var grafted = this.grafter.graft(host_undefined);
      expect(grafted).to.eql(undefined);
    });
  });
});
