module.exports = function(grunt) {
  grunt.loadNpmTasks("grunt-karma");
  grunt.loadNpmTasks("grunt-shell");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-yuidoc");
  grunt.loadNpmTasks("grunt-browserify");

  grunt.initConfig({
    apiSrcDir: "src/js",
    apiBuildDir: "dist",
    apiTestSrcDir: "src/test",
    apiTestBuildDir: "src/test/build",
    pkg: grunt.file.readJSON("package.json"),
    banner: "/*!\n" +
            " * <%= pkg.name %>\n" +
            " * @author <%= pkg.author %>\n" +
            " * @version <%= pkg.version %>\n" +
            " * Copyright <%= pkg.copyright %>\n" +
            " */\n",
    shell: {
      cleanBuild: {
        command: "rm -R <%= apiBuildDir %>/*"
      }
    },
    browserify: {
      api: {
        files: {
          "<%= apiBuildDir %>/jloop-compiled.js": [ "<%= apiSrcDir %>/**/*.js" ]
        },
        options: {
        }
      }
    },
    uglify: {
      api: {
        files: {
          "<%= apiBuildDir %>/jloop.min.js": ["<%= apiBuildDir %>/jloop-compiled.js"]
        }
      }
    },
    jshint: {
      all: [
        "<%= apiSrcDir %>/**/*.js"
      ]
    },
    karma: {
      unit: {
        configFile: "<%= apiTestSrcDir %>/karma-unit.conf.js",
        autoWatch: false,
        singleRun: true
      },
      unit_auto: {
        configFile: "<%= apiTestSrcDir %>/karma-unit.conf.js",
        autoWatch: true,
        singleRun: false
      }
    },
    watch: {
      apiJs: {
        files: [
          "<%= apiSrcDir %>/**/*.js"
        ],
        tasks: ["buildJs"]
      }
    },
    yuidoc: {
      all: {
        name: "<%= pkg.name %>",
        description: "<%= pkg.description %>",
        version: "<%= pkg.version %>",
        url: "<%= pkg.homepage %>",
        options: {
          paths: ["<%= apiSrcDir %>"],
          outdir: "docs"
        }
      }
    }
  });

  grunt.registerTask("clean", ["shell"]);
  grunt.registerTask("docs", ["yuidoc"]);
  grunt.registerTask("test", ["karma:unit"]);
  grunt.registerTask("buildJs", ["test", "browserify", "uglify", "docs"]);
  grunt.registerTask("build", ["buildJs"]);
  grunt.registerTask("run", ["connect:server"]);
};
