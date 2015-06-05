/*global DepTimesApp, Backbone*/

DepTimesApp.Collections = DepTimesApp.Collections || {};

(function () {
  'use strict';

  DepTimesApp.Collections.BusStops = Backbone.Collection.extend({

    model: DepTimesApp.Models.BusStop

  });

})();
