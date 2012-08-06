var ObjectGrafterSourceLoader = function(){};

ObjectGrafterSourceLoader.create = function(){
  var source_loader = new ObjectGrafterSourceLoader();
  return source_loader;
};

ObjectGrafterSourceLoader.prototype.load_source = function(){
  var fs = require("fs");

  var grafter_src = fs.readFileSync(__dirname + "/index.js", "utf-8");
  return grafter_src;
};

module.exports = ObjectGrafterSourceLoader;