/*global DepTimesApp, Backbone, JST*/

DepTimesApp.Views = DepTimesApp.Views || {};

(function () {
  'use strict';

  DepTimesApp.Views.BusStop = Backbone.View.extend({

    template: _.template($('#busStop-template').html()),

    tagName: 'div',

    id: '',

    className: '',

    events: {},

    initialize: function () {
      this.listenTo(this.model, 'change', this.render);
    },

    render: function () {
      this.$el.html(this.template(this.model.toJSON()));
      return this
    }

  });

})();
