/*global DepTimesApp, Backbone, JST*/

DepTimesApp.Views = DepTimesApp.Views || {};

(function () {
  'use strict';

  DepTimesApp.Views.BusStops = Backbone.View.extend({

    template: _.template($('#busStops-template').html()),

    tagName: 'div',

    id: '',

    className: '',

    events: {},

    initialize: function () {
      this.listenTo(this.model, 'change', this.render);
    },

    render: function () {
      var self = this // need reference to this for _.map
      // only expose json in template
      var collection_json = _.map(self.collection.models, function (model) {
        return model.toJSON()
      })

      var time_now = Date.now()

      _.each(collection_json, function(model) {
        if (_.every(model.predictions, function(prediction) { return prediction.epochTime === undefined} )) {
          model.message = "There are no predictions for this bus stop."
        } else {
          var filtered_predictions = _.filter(model.predictions, function (prediction) {
            var time = Math.trunc(parseInt(prediction.epochTime) - time_now)
            return time >= 0
          })
          var message = _.map(filtered_predictions, function (prediction) {
            var time = Math.trunc((parseInt(prediction.epochTime) - time_now) / 60000)
            if (time < 1) {
              return "<strong>Now</strong>: " + prediction.routeTag + " " + prediction.direction
            } else {
              return "<strong>" + time + "min</strong>: " + prediction.routeTag + " " + prediction.direction
            }
          })
          model.message = message.join("<br>")
        }
      });

      this.$el.html(this.template({collection: collection_json, time_now: time_now}));
      return this
    }

  });

})();
