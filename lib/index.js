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
  extension: null
};

var availableTypes = getAvailableTypes();

function isValidType(type) {
  return availableTypes.concat(['random']).indexOf(type) >= 0;
}

function getBasedir() {
  return path.join(path.dirname(__dirname), 'images');
}

function getInputPath(options) {
  var filename = options.type + '.jpg';
  return path.join(getBasedir(), filename);
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

function selectType(options) {
  var type = options.type;

  if (!isValidType(options.type)) {
    type = 'user';
  } else if (options.type === 'random') {
    type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  }

  return type;
}

function getAvailableTypes() {
  var images = fs.readdirSync(getBasedir());
  return _.map(images, function (image) {
    return path.basename(image, ".jpg");
  });
}

function crop(options, cb) {
  var args = [
    '--input', getInputPath(options),
    '--output', options.outputFile,
    '--width', options.width,
    '--height', options.height,
  ];
  var cropper = spawn(CROP_BIN, args);
  cropper.on('close', function (code) {
    if (code === 0) cb(null, options.outputFile);
    else cb(new Error("could not crop"));
  });
}

function setOptions(options) {
  options = _.defaults(options || {}, defaults);
  options.type = selectType(options);
  options.outputFile = getOutputPath(options);
}

module.exports = function (options, cb) {
  cb = cb || function() {};

  try {
    setOptions(options);
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
