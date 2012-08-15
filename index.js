var ObjectGrafter = function(){
  this.seen = [];
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

ObjectGrafter.prototype.mark_object_as_seen = function(object){
  this.seen.push(object);
};

ObjectGrafter.prototype.forget_object_as_seen = function(){
  this.seen.pop();
}

ObjectGrafter.prototype.graft_host_object_properties_to_client_object = function(host_object, client_object, object_safe_properties){
  if(typeof(object_safe_properties) == 'undefined'){
    object_safe_properties = [];
  }

  var generic_safe_properties = ['__lookupGetter__','__lookupSetter__',
                                 '__defineSetter__','__defineGetter__',
                                 '__proto__','toString'];
  
  function is_safe_property(property){
    if(object_safe_properties.indexOf(property) !== -1){
      return true;
    } else if(generic_safe_properties.indexOf(property) !== -1) {
      return true;
    } else {
      return false;
    }
  }
  
  var self = this;

  self.mark_object_as_seen(host_object);

  var properties = Object.getOwnPropertyNames(host_object);
  properties.forEach(function(property){
    if (property == "constructor" || is_safe_property(property)) {
      // do nothing
    } else {
      client_object[property] = self.graft(host_object[property]);
    }
  });

  self.forget_object_as_seen();
  
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
  }
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
  
  var safe_properties = ['constructor','name','arguments','caller',
                         'callee', 'length'];

  this.graft_host_object_properties_to_client_object(object, client_object, safe_properties);

  return client_object;
};

ObjectGrafter.prototype.graft_error_object = function(object){
  var client_object = new Error(object.message);
  var safe_properties = ['constructor','length'];
  this.graft_host_object_properties_to_client_object(object, client_object, safe_properties);

  return client_object;
};

ObjectGrafter.prototype.graft_regexp_object = function(object){
  var options = '';
  if (object.multiline) {
    options += 'm';
  }
  if (object.global) {
    options += 'g';
  }
  if (object.ignoreCase) {
    options += 'i';
  }
  var client_object = new RegExp(object.source, options);
  var safe_properties = ['length','constructor'];
  this.graft_host_object_properties_to_client_object(object, client_object);

  return client_object;
};

ObjectGrafter.prototype.graft_date_object = function(object){
  var client_object = new Date(object);
  var safe_properties = ['constructor','length'];
  this.graft_host_object_properties_to_client_object(object, client_object, safe_properties);

  return client_object;
};

ObjectGrafter.prototype.graft_array_object = function(object){
  var client_object = new Array(object.length);
  var safe_properties = ['constructor','length'];
  this.graft_host_object_properties_to_client_object(object, client_object, safe_properties);

  return client_object;
};

ObjectGrafter.prototype.seen_object_before = function(object){
  if(this.seen.indexOf(object) !== -1){
    return true;
  } else {
    return false;
  }
};

ObjectGrafter.prototype.graft = function(o){  
  if(this.seen_object_before(o)){
    // TODO: This should return the already grafted object
    return undefined;
  }

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
    return this.graft_builtin_type(o);
  }

  if(typeof(o) == "undefined"){
    return undefined;
  }

};