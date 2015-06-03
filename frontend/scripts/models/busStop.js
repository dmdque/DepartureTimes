/*global Test, Backbone*/

Test.Models = Test.Models || {};

(function () {
  'use strict';

  Test.Models.BusStop = Backbone.Model.extend({

    url: '',

    initialize: function() {
    },

    defaults: {
      agencyTitle: "",
      stopTitle: "",
      predictions: [],
      coords: {latitude: null, longitude: null},
      stopId: "",
    },

    validate: function(attrs, options) {
    },

    parse: function(response, options) {
      return response;
    }
  });

})();
