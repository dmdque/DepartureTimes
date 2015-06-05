var user_location
// TODO not global
var all_models = []

var x = document.getElementById("demo");
// default values
var data = {
  "location": {
    "coords": {
      "latitude": 37.791028, // default location (Uber)
      "longitude": -122.393375
    }
  },
  "num_nearest": 20
}

var toggle = function (element) {
  if (element.checked === true) {
    $(".custom_location").show()
    $("._user-location-label").hide()
  }
  else {
    $(".custom_location").hide()
    if (user_location !== undefined) {
      console.log("user locatoin", user_location);
      $("#user-location").text("Latitude: " + user_location.coords.latitude + ", Longitude: " + user_location.coords.longitude)
      $("._user-location-label").show()
    }
  }
}

var getDepartureTimes = function () {
  data.num_nearest = $("input#num-nearest").val()
  if (data.num_nearest < 0 || data.num_nearest > 1000) {
    alert("Please enter a value between 0 and 1000")
    return
  }

  if ($("input[name='custom_location_checkbox']").is(":checked")) {
    $("._user-location-label").hide()
    custom_location = {
      "coords": {
        "latitude": $("input#lat").val(),
        "longitude": $("input#lon").val()
      }
    }
    data.location = custom_location
  } else {
      if (user_location !== undefined) {
        data.location = user_location
      } else {
        alert("Cannot complete request")
      }
  }

  $.ajax({
    url: "get-closest",
    data: data,
    context: document.body
  }).done(function(data) {
    if (data == "distance error") {
      alert("You're too far away from any bus stops. Try Uber instead.")
      return
    }
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
    })
    console.log("bus_stops: ", bus_stops)
    console.log(bus_data_list)

    console.log(_.map(bus_data_list, function (bus_data) { return bus_data.body.predictions }))
    _.map(bus_data_list, function (bus_data) {
      var handle_predictions = function (predictions) {
        var handle_prediction = function (prediction) {
          var handle_direction = function (direction) {
            var handle_prediction2 = function (prediction2) {
              var micro = {
                routeTag: prediction["@routeTag"],
                routeTitle: prediction["@routeTitle"],
                stopTag: prediction["@stopTag"],
                direction: direction["@title"],
                epochTime: prediction2["@epochTime"]
              }
              bus_stops[bus_data.body.stopId].predictions.push(micro)
              // TODO: remove this debugging
              if (micro.epochTime == undefined || micro.routeTitle == undefined) { debugger }
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
    $("#test").prepend(stops_view.render().el);

    if ($("input[name='custom_location_checkbox']").is(":checked")) {
      console.log("using custom location")
      showMap(custom_location)
    } else {
      if (user_location !== undefined) {
        showMap(user_location)
      } else {
        alert("Cannot get your location.")
      }
    }
  });
}

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(savePosition, showError);
  } else {
    x.innerHTML = "Geolocation is not supported by this browser.";
  }
}

function savePosition(position) {
  console.log("getting location")
  user_location = position
}

function showError(error) {
  switch(error.code) {
    case error.PERMISSION_DENIED:
      alert("You must allow the request for Geolocation for it to work.")
      break;
    case error.POSITION_UNAVAILABLE:
      alert("Location information is unavailable.")
      break;
    case error.TIMEOUT:
      alert("The request to get your location timed out.")
      break;
    case error.UNKNOWN_ERROR:
      alert("An unknown error occurred.")
      break;
  }
}

function showMap(position) {
  lat = position.coords.latitude;
  lon = position.coords.longitude;

  latlon = new google.maps.LatLng(lat, lon)
  mapholder = document.getElementById('map-canvas')

  var mapOptions = {
    center: latlon,
    zoom: 17,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false,
    navigationControlOptions: {style: google.maps.NavigationControlStyle.ANDROID}
  }

  var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
  var marker = new google.maps.Marker({position:latlon,map:map,title:"You are here!"});
  $("._map-description").show()

  var marker_min_threshold = 10 * 60
  var time_now = Date.now()

  _.each(all_models, function(model) {
    if (
      model.get("predictions")[0] &&
      model.get("predictions")[0].epochTime &&
      (parseInt(model.get("predictions")[0].epochTime) - time_now) >= 0 &&
      (parseInt(model.get("predictions")[0].epochTime) - time_now) / 1000 < marker_min_threshold
    ) {
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
          radius: (marker_min_threshold - Math.min(
            (parseInt(model.get("predictions")[0].epochTime) - time_now) / 1000,
            marker_min_threshold
          )) / 20 + 5
        };

        console.log("radius", circleOptions.radius)
        // Add the circle for this city to the map.
        cityCircle = new google.maps.Circle(circleOptions);
      }
    }
  })

  _.each(all_models, function(model) {
    if (
      model.get("predictions")[0] &&
      model.get("predictions")[0].epochTime &&
      (parseInt(model.get("predictions")[0].epochTime) - time_now) >= 0 &&
      (parseInt(model.get("predictions")[0].epochTime) - time_now) / 1000 < marker_min_threshold
    ) {
      var pos = new google.maps.LatLng(
        model.get("coords").latitude,
        model.get("coords").longitude
      )
      var infowindow = new google.maps.InfoWindow({
        map: map,
        position: pos,
        content: Math.floor((parseInt(model.get("predictions")[0].epochTime) - time_now) / 60000) + " min"
      });
    }
  })

}

getLocation()
