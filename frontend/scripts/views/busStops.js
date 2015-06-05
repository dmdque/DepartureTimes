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

      // we will only expose json in the template
      var collection_json = _.map(self.collection.models, function (model) {
        return model.toJSON()
      })

      var time_now = Date.now() // used to compare prediction times
      // massage collection_json to be more easily presentable in the template
      _.each(collection_json, function(model) {
        var is_at_least_one_prediction = _.every(model.predictions, function(prediction) {
          return prediction.epochTime === undefined
        })
        if (is_at_least_one_prediction) {
          model.message = "There are no predictions for this bus stop."
        } else {
          // some of the predictions might have been cached by the server
          // filter out all predictions with a negative arrival time
          var filtered_predictions = _.filter(model.predictions, function (prediction) {
            var arrival_time = Math.trunc(parseInt(prediction.epochTime) - time_now)
            return arrival_time >= 0
          })
          // create message string to be shown for each bus stop
          var message = _.map(filtered_predictions, function (prediction) {
            var arrival_time_min = Math.trunc((parseInt(prediction.epochTime) - time_now) / 60000)
            if (arrival_time_min < 1) {
              return "<strong>Now</strong>: " + prediction.routeTag + " " + prediction.direction
            } else {
              return "<strong>" + arrival_time_min + "min</strong>: " + prediction.routeTag + " " + prediction.direction
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
