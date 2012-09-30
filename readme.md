
Object Grafter
==============
Utility to safely move Javascript objects from one V8 context to another.

``` javascript
var loader = require('object-grafter').create();
var source = loader.load_source();

// WeakMap is required for caching
var filename = require.resolve("es6-collections");
var fs = require("fs");
var weakmap_src = fs.readFileSync(filename);

var vm = require('vm');
var client_context = vm.createContext();
vm.runInContext(weakmap_src, client_context);
vm.runInContext(source, client_context);
var grafter = vm.runInContext('ObjectGrafter.create()', client_context);
grafter.set_host_builtin_objects({
  "Array": Array,
  "Date" : Date,
  "Error" : Error,
  "RegExp" : RegExp,
  "Object" : Object,
  "String" : String
});

var host_date = new Date(); // Create a Date object in the host context
var grafted_date = grafter.graft(host_date); // Graft the date to the client context

var assert = require('assert');
assert.strictEqual(host_date.constructor,Date); // Duh
// The grafted object does not reference the host context
assert.notStrictEqual(grafted_date.constructor,Date); 

// The grafted object has the same value as the host object
assert.strictEqual(host_date.toString(), grafted_date.toString()); 

// The grafted object thinks it was created inside the client context
assert.strictEqual(grafted_date.constructor, vm.runInContext("Date", client_context));
```

## Things that don't work yet
- Function Constructors

## Attribution
Heavily inspired by [Bradley Meck's "object wrapper"](http://bit.ly/MZHS6k).
