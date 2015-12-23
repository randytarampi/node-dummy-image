var _         = require('lodash');
var path      = require('path');
var fs        = require('fs');
var spawn     = require('child_process').spawn;

var CROP_BIN = path.join(path.dirname(__dirname), 'bin', 'cropper');

var defaults = {
  width: 128,
  height: 128,
  type: 'user',
  quality: 90,
  outputDir: process.cwd(),
  outputPath: null,
  inputPath: null,
  extension: null
};

var defaultType = 'user';
var randomType = 'random';
var availableTypeImagePairs = getAvailableTypeImagePairs();

function isValidType(type) {
  return _.pluck(availableTypeImagePairs.concat({type: randomType}), 'type').indexOf(type) >= 0;
}

function getInputPath(options) {
  if (options.inputPath) {
    return options.inputPath;
  }

  var type = options.type;
  var typeImagePair = _.findWhere(availableTypeImagePairs, {type: type});

  if (type === 'random') {
    typeImagePair = availableTypeImagePairs[Math.floor(Math.random() * availableTypeImagePairs.length)];
  }

  return typeImagePair.path;
}

function getOutputPath(options) {
  if (options.outputPath) {
    return options.outputPath;
  }

  var imageName = options.type + '-' + options.width + 'x' + options.height;
  var imageExtension = options.extension || 'jpg';
  var imageFile = imageName + '.' + imageExtension;
  return path.join(options.outputDir, imageFile);
}

function checkFile(options, cb) {
  try {
    var fileStats = fs.statSync(options.outputFile);

    if (!options.force) {
      return cb(new Error("outputFile already exists with stats: " + JSON.stringify(fileStats)), options);
    }

    cb(null, options);
  } catch (e) {
    if (e.message.indexOf('no such file or directory') === -1) {
      return cb(e, options);
    }

    cb(null, options);
  }
}

function getAvailableTypeImagePairs() {
  var baseDir = path.join(path.dirname(__dirname), 'images');
  var imagePaths = fs.readdirSync(baseDir);

  return _.map(imagePaths, function (image) {
    return {type: path.basename(image, path.parse(image).ext), path: path.join(baseDir, image)};
  });
}

function crop(options, cb) {
  var args = [
    '--input', options.inputFile,
    '--output', options.outputFile,
    '--width', options.width,
    '--height', options.height
  ];
  var cropper = spawn(CROP_BIN, args);
  cropper.on('close', function (code) {
    if (code === 0) cb(null, options.outputFile);
    else cb(new Error("could not crop file for options:" + JSON.stringify(options)));
  });
}

module.exports = function (options, cb) {
  cb = cb || function() {};

  try {
    options = _.defaults(options || {}, defaults);
    options.type = !isValidType(options.type) ? defaultType : options.type;
    options.inputFile = getInputPath(options);
    options.outputFile = getOutputPath(options);
  } catch (err) {
    if (cb) cb(err);
    return "";
  }

  checkFile(options, function (err, options) {
    if (err) return cb(null, options.outputFile);
    crop(options, cb);
  });

  return options.outputFile;
};
