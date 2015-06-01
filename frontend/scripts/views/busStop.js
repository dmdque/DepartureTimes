/*global Test, Backbone, JST*/

Test.Views = Test.Views || {};

(function () {
  'use strict';
  console.log("views starting")

  Test.Views.BusStop = Backbone.View.extend({

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
  console.log("busstopview", Test.Views.BusStop)

})();
