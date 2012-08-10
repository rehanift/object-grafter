var ObjectGrafter = function(){

};

ObjectGrafter.create = function(){
  var grafter = new ObjectGrafter();
  return grafter;
};

ObjectGrafter.prototype.set_host_builtin_objects = function(objects){
  this.host_builtin_objects = objects;
};

ObjectGrafter.prototype.graft_builtin_type = function(type){
  return JSON.parse(JSON.stringify(type));
};

ObjectGrafter.prototype.graft_host_object_properties_to_client_object = function(host_object, client_object){
  var self = this;
  var properties = Object.getOwnPropertyNames(host_object);
  properties.forEach(function(property){
    if (property == "constructor") {
      client_object[property] = property;
    } else {
      client_object[property] = self.graft(host_object[property]);
    }
  });
  
  return client_object;  
};

ObjectGrafter.prototype.graft_objects_and_functions = function(object){
  if (object == null) {
    return null;
  }

  /*
   * Built-in Object Constructors
   */

  if (object === this.host_builtin_objects["Array"]) {
    return Array;
  }

  if (object === this.host_builtin_objects["Date"]) {
    return Date;
  }

  if (object === this.host_builtin_objects["Error"]) {
    return Error;
  }
  
  if (object === this.host_builtin_objects["RegExp"]) {
    return RegExp;
  }

  if (object === this.host_builtin_objects["Object"]) {
    return Object;
  }

  /*
   * Functions
   */

  if(typeof(object) == "function") {
    return this.graft_function(object);
  }

  /*
   * Built-in Object instances
   */

  var client_object;

  if(object instanceof this.host_builtin_objects["Date"]){
    return this.graft_date_object(object);
  } else if(object instanceof this.host_builtin_objects["Array"]) {
    return this.graft_array_object(object);
  } else if (object instanceof this.host_builtin_objects["RegExp"]){
    return this.graft_regexp_object(object);
  } else if(object instanceof this.host_builtin_objects["Error"]) {
    return this.graft_error_object(object);
  } else {
    return this.graft_object(object);
    client_object = {};

  }

  return this.graft_host_object_properties_to_client_object(object, client_object);
};

ObjectGrafter.prototype.graft_object = function(host_object){
  var client_object = {};
  
  if(host_object.__proto__ !== this.host_builtin_objects["Object"].prototype) {
    client_object.__proto__ = this.graft(host_object.__proto__);
  }

  this.graft_host_object_properties_to_client_object(host_object, client_object);

  return client_object;
};

ObjectGrafter.prototype.graft_function = function(object){
  var self = this;
  var apply = Function.prototype.call.bind(Function.prototype.apply);
  var client_object = function(){
    "use strict";
    var grafted_args = [],
        return_value;

    for(var i=0; i< arguments.length; i++){
      grafted_args.push(self.graft(arguments[i]));
    }
    
    try {
      return_value = apply(object, this, grafted_args);
    } catch(e){
      var grafted_exception = self.graft(e);
      throw grafted_exception;
    }
    
    return self.graft(return_value);
  };

  this.graft_host_object_properties_to_client_object(object, client_object);

  return client_object;
};

ObjectGrafter.prototype.graft_error_object = function(object){
  var client_object = new Error(object.message);
  this.graft_host_object_properties_to_client_object(object, client_object);
  client_object.stack = this.graft(client_object.stack);

  return client_object;
};

ObjectGrafter.prototype.graft_regexp_object = function(object){
  var client_object = new RegExp(object.source);
  this.graft_host_object_properties_to_client_object(object, client_object);

  return client_object;
};

ObjectGrafter.prototype.graft_date_object = function(object){
  var client_object = new Date(object);
  this.graft_host_object_properties_to_client_object(object, client_object);

  return client_object;
};

ObjectGrafter.prototype.graft_array_object = function(object){
  var client_object = new Array(object.length);
  this.graft_host_object_properties_to_client_object(object, client_object);

  return client_object;
};

ObjectGrafter.prototype.graft = function(o){
  if (typeof(o) == "function" || typeof(o) == "object") {
    return this.graft_objects_and_functions(o);
  }

  /*
   * Built-in Types
   */

  if(typeof(o) == "number"){
    return this.graft_builtin_type(o);
  }

  if(typeof(o) == "boolean"){
    return this.graft_builtin_type(o);
  }

  if(typeof(o) == "string"){
    return (new String(o)).toString();
    //return this.graft_builtin_type(o);
  }

  if(typeof(o) == "undefined"){
    return undefined;
  }

};