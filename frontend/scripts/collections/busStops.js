/*global Test, Backbone*/

Test.Collections = Test.Collections || {};

(function () {
  'use strict';

  Test.Collections.BusStops = Backbone.Collection.extend({

    model: Test.Models.BusStop

  });

})();
