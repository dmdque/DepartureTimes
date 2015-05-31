/*global Test, Backbone*/

Test.Models = Test.Models || {};

(function () {
    'use strict';

    Test.Models.BusStop = Backbone.Model.extend({

        url: '',

        initialize: function() {
        },

        defaults: {
            title: "",
            predictions: [],
            coords: {latitude: null, longitude: null},
            tag: "",
            stopId: "",
            route: ""
        },

        validate: function(attrs, options) {
        },

        parse: function(response, options)  {
            return response;
        }
    });

})();
