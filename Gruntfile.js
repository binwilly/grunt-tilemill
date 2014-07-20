'use strict';

module.exports = function (grunt) {

  /** Configurable paths
   * IMPORTANT: projectPath must be the same of tileMill setting (Application settings -> Documents)
   */
  var config = {
    tileMillPath: '/Applications/TileMill.app/Contents/Resources/',
    tileMillDocumentPath: '/Users/--user--/Documents/MapBox/project/',
    outputMBTiles: '/Users/--user--/Desktop/mbtiles/',
    datasetPath: '/Users/--user--/Desktop/bk_mvd_test/',
    projectTemplate: '/Users/--user--/Desktop/bk_template/',
    layersTogethers: false,
    prependName: 'mvd_',
    projectName: 'bk_export_bot',
    syncAccount: 'binwilly',
    upload: false
  };

  config.projectPath = config.tileMillDocumentPath + config.projectName + '/';

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({

    config: config,

    shell: {
      exportMap: {
        options: {
          stderr: false
        },
        command: function (fileName) {
          return [
            'cd ' + config.tileMillPath,
            './index.js export '+ config.projectName + ' ' + config.outputMBTiles
              + fileName + '.mbtiles'
              + ' --format=mbtiles'
          ].join('&&');
        }
      },
      exportMapAndUpload: {
        options: {
          stderr: true
        },
        command: function (fileName) {
          return [
            'cd ' + config.tileMillPath,
            './index.js export ' + fileName + ' ' + config.outputMBTiles 
              + fileName + '.mbtiles'
              + ' --syncAccount=' + config.syncAccount
              + ' --format=upload'
          ].join('&&');
        }
      }
    },

    // Empties folders to start fresh
    clean: {
      project: {
        options: { force: true },
        files: [{
          dot: true,
          src: [
            config.projectPath + '*'
          ]
        }]  
      },
      mbtiles: {
        options: { force: true },
        files: [{
          dot: true,
          src: [
            config.outputMBTiles + '*'
          ]
        }]  
      }
    },
    // Copy template and datesets files.
    copy: {
      datasets: {
        files: [{
          expand: true,
          cwd: config.datasetPath,
          dest: config.projectPath,
          src: '**'
        }]
      },
      template: {
        files: [{
          expand: true,
          cwd: config.projectTemplate,
          dest: config.projectPath,
          src: '**'
        }]
      }
    }

  });

  // Upload mbtiles
  grunt.registerTask('upload', function () {

  });

  // Export layers of the project, all in one mbtile or each per layer.
  grunt.registerTask('exportLayer', function (layerName) {

    // If export together is true, I don't need layer name.
    if (!config.layersTogethers && layerName == null) {
      grunt.warn('Layer param missed. Ex: exportLayer:bikeshop.');
      return;
    }

    var projectConfig = grunt.file.readJSON(config.projectPath + 'project.mml', {encoding:"utf8"}),
        layers = projectConfig.Layer,
        fileName = config.prependName;

    // Loop to enable the layer to export and disable the rest.
    layers.forEach(function (element, index) {
      if (config.layersTogethers) {
        element.status = 'On';
      } else {
        if (layerName === element.name) {
          element.status = 'On';
        } else {
          element.status = 'Off';
        }
      }
    });

    // Change project name to layer name so in mapbox data we can see layer name.
    if (!config.layersTogethers) {
      projectConfig.name = fileName += layerName;
    } else {
      fileName += projectConfig.name;
    }

    grunt.file.write(config.projectPath + 'project.mml', JSON.stringify(projectConfig), {encoding:"utf8"});

    /**
     * @TODO: move upload to other task
     */
    if (config.upload)
      grunt.task.run(['shell:exportMapAndUpload:' + fileName]);
    else
      grunt.task.run(['shell:exportMap:' + fileName]);

  });

  // Export tileMill entry point. Loops en each layer and export it.
  grunt.registerTask('export', function (upload) {
    var projectConfig = grunt.file.readJSON(config.projectPath + 'project.mml', {encoding:"utf8"}),
        layers = projectConfig.Layer;

    // Set true to upload after export mbtiles.    
    if (upload != null)
      config.upload = true;

    grunt.verbose.write('Exporting: ' + config.projectPath);

    // If need to export all labels together call one time.
    if (config.layersTogethers) {
      grunt.task.run(['exportLayer']);
    } else {
      // Loop for each layer
      layers.forEach(function (layer, index, array) {
        var layerName = layer.name;

        grunt.verbose.write('Exporting Layer: ' + layerName);
        grunt.task.run(['exportLayer:' + layerName]);
      });
    }

  });

  // Export project
  grunt.registerTask('exportMbtiles', [
    'clean:project',
    'copy:datasets',
    'copy:template',
    'clean:mbtiles',
    'export'
  ]);

  // Export project and upload
  grunt.registerTask('uploadMbtiles', [
    'exportMbtiles',
    'export:upload'
  ]);

};
