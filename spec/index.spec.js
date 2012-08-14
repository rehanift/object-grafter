var chai = require("chai");
var expect = chai.expect;
var should = chai.should();
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
chai.use(sinonChai);

var load_object_grafter = function(context){
  var object_grafter_source_loader = require("./../source_loader").create();
  var grafter_src = object_grafter_source_loader.load_source();
  var vm = require("vm");
  vm.runInContext(grafter_src, context);
  return vm.runInContext("ObjectGrafter.create()", context);
};

var make_get_ctor_fn_from_client_context = function(context){
  var vm = require("vm");
  var get_constructor = function(object){
    return object.constructor;
  };

  return vm.runInContext("("+get_constructor.toString()+")", context);
};

describe("An Object Grafter", function(){
  beforeEach(function(){
    var vm = require("vm");
    this.client_context = vm.createContext();
    this.client_builtin_objects = {
      "Array": vm.runInContext("Array", this.client_context),
      "Date": vm.runInContext("Date", this.client_context),
      "Error": vm.runInContext("Error", this.client_context),
      "RegExp": vm.runInContext("RegExp", this.client_context),
      "Object": vm.runInContext("Object", this.client_context),
      "Function": vm.runInContext("Function", this.client_context),
      "String": vm.runInContext("String", this.client_context),
      "Boolean": vm.runInContext("Boolean", this.client_context),
      "Number": vm.runInContext("Number", this.client_context)
    };
    this.grafter = load_object_grafter(this.client_context);

    this.grafter.set_host_builtin_objects({
      "Array": Array,
      "Date" : Date,
      "Error" : Error,
      "RegExp" : RegExp,
      "Object" : Object,
      "String" : String
    });

    this.get_ctor_from_client_context = make_get_ctor_fn_from_client_context(this.client_context);
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
      var grafted_ctor = this.get_ctor_from_client_context(grafted);

      expect(grafted_ctor).to.equal(this.client_builtin_objects["Function"]);
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
      var grafted_ctor = this.get_ctor_from_client_context(return_value);
      expect(grafted_ctor).to.equal(this.client_builtin_objects["Date"]);
    });

    it("grafts thrown exceptions",function(){
      var host_fn = function(){
        throw new Error("Foo");
      };
      var grafted_host_fn = this.grafter.graft(host_fn);
      try {
        grafted_host_fn();
      } catch(e) {
        expect(e.constructor).to.equal(this.client_builtin_objects["Error"]);       
      }
    });

    it("grafts arguments", function(){
      var spy = sinon.spy();
      var host_fn = function(foo,bar){
        spy(foo,bar);
      };
      var grafted_host_fn = this.grafter.graft(host_fn);
      var foo = new Date();
      var bar = new Object();
      var grafted_foo = this.grafter.graft(foo);
      var grafted_bar = this.grafter.graft(bar);

      grafted_host_fn(foo,bar);

      spy.should.have.been.calledWith(grafted_foo, grafted_bar);
    });

    it("grafts callback arguments", function(){
      var self = this;
      var host_fn = function(cb){
        var date = new Date();
        cb(date);
      };
      var grafted_host_fn = this.grafter.graft(host_fn);
      
      grafted_host_fn(function(date){
        expect(date.constructor).to.equal(self.client_builtin_objects["Date"]);
      });
    });
  });

  describe("Built-in Object Instances", function(){

    describe("RegExp", function(){
      beforeEach(function(){
        this.host_regexp = new RegExp(".*", 'mgi');
        this.grafted = this.grafter.graft(this.host_regexp);
      });
      
      it("grafts a RegExp object to the client context's RegExp constructor", function(){
        var grafted_ctor = this.get_ctor_from_client_context(this.grafted);
        expect(grafted_ctor).to.equal(this.client_builtin_objects["RegExp"]);
      });

      it("preserves the host RegExp object's source", function(){
        expect(this.grafted.source).to.eql(this.host_regexp.source);
      });

      it("preserves the host RegExp object's options", function(){
        expect(this.grafted.multiline).to.eql(this.host_regexp.multiline);
        expect(this.grafted.global).to.eql(this.host_regexp.global);
        expect(this.grafted.ignoreCase).to.eql(this.host_regexp.ignoreCase);
      });
    });



    describe("Errors", function(){
      it("grafts an Error object", function(){
        var host_error_object = new Error();
        var grafted = this.grafter.graft(host_error_object);
        var grafted_ctor = this.get_ctor_from_client_context(grafted);
        expect(grafted_ctor).to.equal(this.client_builtin_objects["Error"]);
      });

      it("grafts an error objects stack", function(){
        var host_error_object = new Error();
        var grafted = this.grafter.graft(host_error_object);
        var grafted_ctor = this.get_ctor_from_client_context(grafted.stack);
        expect(grafted_ctor).to.equal(this.client_builtin_objects["String"]);
      });

      it("grafts an error objects name", function(){
        var host_error_object = new Error();
        var grafted = this.grafter.graft(host_error_object);
        var grafted_ctor = this.get_ctor_from_client_context(grafted.name);
        expect(grafted_ctor).to.equal(this.client_builtin_objects["String"]);
      });
    });
    

    it("grafts a Date object", function(){
      var host_date_object = new Date();
      var grafted = this.grafter.graft(host_date_object);
      var grafted_ctor = this.get_ctor_from_client_context(grafted);
      expect(grafted_ctor).to.equal(this.client_builtin_objects["Date"]);
      expect(grafted.toString()).to.eql(host_date_object.toString());
    });

    describe("Array", function(){
      beforeEach(function(){
        this.host_array_object = new Array(3);
        this.host_array_object[0] = "foo";
        this.host_array_object[1] = true;
        this.host_array_object[2] = 2;
        this.grafted = this.grafter.graft(this.host_array_object);
      });

      it("grafts an Array object to the client Array constructor", function(){
        var grafted_ctor = this.get_ctor_from_client_context(this.grafted);
        expect(grafted_ctor).to.equal(this.client_builtin_objects["Array"]);
      });

      it("copies an equivalent array", function(){
        expect(this.grafted).to.eql(["foo",true,2]);
      });
    });

    describe("when grafting custom Objects",function(){
      it("grafts custom object properties", function(){
        var host_object = new Object();
        host_object.host_date = new Date();
        
        var grafted = this.grafter.graft(host_object);
        var grafted_ctor = this.get_ctor_from_client_context(grafted);
        var grafted_property_ctor = this.get_ctor_from_client_context(grafted.host_date);

        expect(grafted_ctor).to.equal(this.client_builtin_objects["Object"]);
        expect(grafted_property_ctor).to.equal(this.client_builtin_objects["Date"]);
      });

      it("grafts a custom object's prototype", function(){
        var host_ctor = function(){};
        var spy = sinon.spy();
        host_ctor.prototype = {
          foo: function(){ spy(); }
        };
        var host_object = new host_ctor();
        
        var grafted_object = this.grafter.graft(host_object);
        grafted_object.foo();

        spy.should.have.been.calledWith();
      });

      it("does not get stuck in infinite circular references", function(){
        var host_ctor = function(){
          this.foo = this;
        };
        var host_object = new host_ctor();
        var grafted = this.grafter.graft(host_object);
        expect(grafted.foo).to.equal(undefined);
      });

    });   
  });

  describe("Built-in Types", function(){
    it("grafts a number", function(){
      var host_number = 2;
      var grafted = this.grafter.graft(host_number);
      var grafted_ctor = this.get_ctor_from_client_context(grafted);
      expect(grafted_ctor).to.equal(this.client_builtin_objects["Number"]);
    });

    it("grafts a boolean", function(){
      var host_boolean = true;
      var grafted = this.grafter.graft(host_boolean);
      var grafted_ctor = this.get_ctor_from_client_context(grafted);
      expect(grafted_ctor).to.equal(this.client_builtin_objects["Boolean"]);
    });

    it("grafts a string", function(){
      var host_string = "foo";
      var grafted = this.grafter.graft(host_string);
      var grafted_ctor = this.get_ctor_from_client_context(grafted);
      expect(grafted_ctor).to.equal(this.client_builtin_objects["String"]);
    });

    it("grafts undefined", function(){
      var host_undefined = undefined;
      var grafted = this.grafter.graft(host_undefined);
      expect(grafted).to.eql(undefined);
    });
  });
});
