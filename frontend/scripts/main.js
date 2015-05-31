/*global Test, $*/


window.Test = {
    Models: {},
    Collections: {},
    Views: {},
    Routers: {},
    init: function () {
        'use strict';

        console.log('Hello from Backbone!');
        var busstopmodel = new Test.Models.BusStop()
        console.log("busstopmodel", busstopmodel)
        busstopmodel.set("title", "foooo")
        var busstopview = new Test.Views.BusStop({model: busstopmodel})
        console.log("busstopview", busstopview)
        //new this.Views.BusStopsView({
            //collection: new this.Collections.BusStops()
        //});
        console.log("newesta")
        console.log("newest", busstopview.render().el)
        $("#closest_bus_stops").append(busstopview.render().el);

        var busstopcollection = []
        for(var i = 0; i < 10; i++) {
            var busstopmodel = new Test.Models.BusStop()
            busstopmodel.set("title", "foooo" + i)
            busstopcollection.push(busstopmodel)
        }
        console.log("busstopcollection", busstopcollection)
        var col = new Test.Collections.BusStops(busstopcollection)
        var colView = new Test.Views.BusStops({collection: col})
        $("#closest_bus_stops").append(colView.render().el);

    }
};

$(document).ready(function () {
    'use strict';
    Test.init();
});
