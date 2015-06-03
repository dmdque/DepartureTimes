var x = document.getElementById("demo");
var data = {
  "location": {
    "coords": {
      "latitude": 37.791028,
      "longitude": -122.393375
    }
  },
  "num_nearest": 20
}
var bus_data
// TODO: not global
all_models = []
var getDepartureTimes = function () {
  if ($("input[name='custom_location']").is(":checked")) {
    custom_location = {
      "coords": {
        "latitude": $("input#lat").val(),
        "longitude": $("input#lon").val()
      }
    }
    data.location = custom_location
    //showPosition(custom_location)
  } else {
    //getLocation()
  }

  $.ajax({
    url: "get-closest",
    data: data,
    context: document.body
  }).done(function(data) {
    var data_list_json = JSON.parse(data)
    console.log(data_list_json)
    var bus_data_list = _.map(data_list_json, function (bus_data) {
      return JSON.parse(bus_data)
    })
    bus_stops = {}
    _.each(bus_data_list, function (bus_data) {
      bus_stops[bus_data.body.stopId] = {
        agencyTitle: bus_data.body.predictions["@agencyTitle"],
        stopTitle: bus_data.body.predictions["@stopTitle"],
        coords: {
          latitude: bus_data.body.lat,
          longitude: bus_data.body.lon,
        },
        stopId: bus_data.body.stopId,
        predictions: []
      }
      console.log("iddd", bus_data.body.stopId)
    })
    console.log("bus_stops: ", bus_stops)
    console.log(bus_data_list)

    console.log(_.map(bus_data_list, function (bus_data) { return bus_data.body.predictions }))
    _.map(bus_data_list, function (bus_data) {
      // TODO* handle case where there are no directions by displaying route info and no times
      var handle_predictions = function (predictions) {
        var handle_prediction = function (prediction) {
          var handle_direction = function (direction) {
            var handle_prediction2 = function (prediction2) {
              var micro = {
                // TODO: should these have title in them?
                routeTag: prediction["@routeTag"],
                routeTitle: prediction["@routeTitle"],
                stopTag: prediction["@stopTag"],
                direction: direction["@title"],
                epochTime: prediction2["@epochTime"],
                seconds: prediction2["@seconds"]
              }
              bus_stops[bus_data.body.stopId].predictions.push(micro)
              // TODO: remove this debugging
              if (micro.seconds == undefined || micro.routeTitle == undefined) { debugger }
            }
            if (direction.prediction !== undefined) { // not sure if this one is needed
              if (direction.prediction.constructor === Array) {
                _.each(direction.prediction, function (prediction2) {
                  handle_prediction2(prediction2)
                })
              } else {
                handle_prediction2(direction.prediction)
              }
            }
          }
          if (prediction.direction !== undefined) { // sometimes predictions don't have a direction field
            if (prediction.direction.constructor === Array) {
              _.each(prediction.direction, function (direction) {
                handle_direction(direction)
              })
            } else {
              handle_direction(prediction.direction)
            }
          } else {
            // this creates a placeholder prediction, for when a bus
            // stop has no predictions
            //if (predictions.constructor !== Array) {
              //var micro = {
                //routeTag: prediction["@routeTag"],
                //routeTitle: prediction["@routeTitle"],
                //stopTag: prediction["@stopTag"]
              //}
              //bus_stops[bus_data.body.stopId].predictions.push(micro)
            //}
          }
        }
        // note that this case rarely occurs, if ever
        if (predictions !== undefined) {
          if (predictions.constructor === Array) {
            _.each(predictions, function (prediction) {
              handle_prediction(prediction)
            })
          } else {
            handle_prediction(predictions)
          }
        }
      }
      handle_predictions(bus_data.body.predictions)
    })
    console.log(bus_stops)

    // TODO: sort each bus_stop.predictions
    // TODO: sort collection based on nearest time
    // TODO: this isn't that nice
    var stop_models = []
    _.each(bus_stops, function (bus_stop, key) {
      bus_stop.predictions.sort(function(a, b) {
        if (a == undefined) {
          console.log("yoyoyo")
          return 1
        }
        if (b == undefined)
          return -1
        return parseInt(a.epochTime) - parseInt(b.epochTime)
      })
      console.log(_.map(bus_stop.predictions, function (p) { return parseInt(p.epochTime) }))
      var stop_model = new Test.Models.BusStop({
        "agencyTitle": bus_stop.agencyTitle,
        "stopTitle": bus_stop.stopTitle,
        "predictions": bus_stop.predictions,
        "stopId": bus_stop.stopId,
        "coords": bus_stop.coords
      })
      stop_models.push(stop_model)
    })
    all_models = stop_models
    console.log("all_models", all_models)
    var stops_collection = new Test.Collections.BusStops(stop_models)
    var stops_view = new Test.Views.BusStops({collection: stops_collection})
    $("#test").append(stops_view.render().el);

    showPosition(custom_location)
  });
}
function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition, showError);
  } else {
    x.innerHTML = "Geolocation is not supported by this browser.";
  }
}

function showPosition(position) {
  lat = position.coords.latitude;
  lon = position.coords.longitude;

  latlon = new google.maps.LatLng(lat, lon)
  mapholder = document.getElementById('map-canvas')
  mapholder.style.height = '250px';
  mapholder.style.width = '500px';

  var mapOptions = {
    center:latlon,
    zoom: 17,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl:false,
    navigationControlOptions:{style:google.maps.NavigationControlStyle.SMALL}
  }

  var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

  var marker_threshold = 5 * 60 // 5 minutes

  _.each(all_models, function(model) {
    if (model.get("predictions")[0] && model.get("predictions")[0].seconds && model.get("predictions")[0].seconds < marker_threshold) {
      if (model.get("predictions").length > 0) {
        var circleOptions = {
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
          map: map,
          center: new google.maps.LatLng(
            model.get("coords").latitude,
            model.get("coords").longitude
          ),
          radius: (marker_threshold - model.get("predictions")[0].seconds) / 10 + 5
        };
        console.log((marker_threshold - model.get("predictions")[0].seconds) / 10 + 5)

        // Add the circle for this city to the map.
        cityCircle = new google.maps.Circle(circleOptions);
      }
    }
  })

  var marker = new google.maps.Marker({position:latlon,map:map,title:"You are here!"});

  _.each(all_models, function(model) {
    if (model.get("predictions")[0] && model.get("predictions")[0].seconds && model.get("predictions")[0].seconds < marker_threshold) {
      var pos = new google.maps.LatLng(
        model.get("coords").latitude,
        model.get("coords").longitude
      )
      var infowindow = new google.maps.InfoWindow({
        map: map,
        position: pos,
        content: Math.floor(model.get("predictions")[0].seconds / 60) + " min"
      });
    }
  })

}

function showError(error) {
  switch(error.code) {
    case error.PERMISSION_DENIED:
      x.innerHTML = "User denied the request for Geolocation."
      break;
    case error.POSITION_UNAVAILABLE:
      x.innerHTML = "Location information is unavailable."
      break;
    case error.TIMEOUT:
      x.innerHTML = "The request to get user location timed out."
      break;
    case error.UNKNOWN_ERROR:
      x.innerHTML = "An unknown error occurred."
      break;
  }
}

