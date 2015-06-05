/*global DepTimesApp, Backbone*/

DepTimesApp.Models = DepTimesApp.Models || {};

(function () {
  'use strict';

  DepTimesApp.Models.BusStop = Backbone.Model.extend({

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
