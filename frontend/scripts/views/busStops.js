/*global Test, Backbone, JST*/

Test.Views = Test.Views || {};

(function () {
  'use strict';

  Test.Views.BusStops = Backbone.View.extend({

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
      this.$el.html(this.template({collection: collection_json}));
      return this
    }

  });

})();
