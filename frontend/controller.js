var user_location

var onToggleCheckbox = function (element) {
  if (element.checked === true) {
    $(".custom_location").show()
    $("._user-location-label").hide()
  }
  else {
    $(".custom_location").hide()
    if (user_location !== undefined) {
      $("#user-location").text("Latitude: " + user_location.coords.latitude + ", Longitude: " + user_location.coords.longitude)
      $("._user-location-label").show()
    }
  }
}

var getDepartureTimes = function () {
  var data = {}
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
        alert("Cannot complete request.")
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

    // data is a json of an array of jsons
    var data_list_json = JSON.parse(data)
    var bus_data_list = _.map(data_list_json, function (bus_data) {
      return JSON.parse(bus_data)
    })

    // this hash object is group predictions by their stopId
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

    // massages the bus data and converts them into backbone models
    // makes use of many helper functions to deal with branching cases of api
    _.map(bus_data_list, function (bus_data) {
      var handle_predictions = function (predictions) {
        var handle_prediction = function (prediction) {
          var handle_direction = function (direction) {
            var handle_prediction2 = function (prediction2) {
              var pred = {
                routeTag: prediction["@routeTag"],
                routeTitle: prediction["@routeTitle"],
                stopTag: prediction["@stopTag"],
                direction: direction["@title"],
                epochTime: prediction2["@epochTime"]
              }
              bus_stops[bus_data.body.stopId].predictions.push(pred)
            }
            if (direction.prediction !== undefined) {
              if (direction.prediction.constructor === Array) {
                _.each(direction.prediction, function (prediction2) {
                  handle_prediction2(prediction2)
                })
              } else {
                handle_prediction2(direction.prediction)
              }
            }
          }
          // sometimes predictions don't have a direction field
          if (prediction.direction !== undefined) {
            if (prediction.direction.constructor === Array) {
              _.each(prediction.direction, function (direction) {
                handle_direction(direction)
              })
            } else {
              handle_direction(prediction.direction)
            }
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

    // create an array of Backbone models for the bus stops
    var stop_models = _.map(bus_stops, function (bus_stop, key) {
      // first we sort the predictions by arrival time
      bus_stop.predictions.sort(function(a, b) {
        if (a == undefined) return 1
        if (b == undefined) return -1
        return parseInt(a.epochTime) - parseInt(b.epochTime)
      })
      var stop_model = new DepTimesApp.Models.BusStop({
        "agencyTitle": bus_stop.agencyTitle,
        "stopTitle": bus_stop.stopTitle,
        "predictions": bus_stop.predictions,
        "stopId": bus_stop.stopId,
        "coords": bus_stop.coords
      })
      return stop_model
    })

    var stops_collection = new DepTimesApp.Collections.BusStops(stop_models)
    var stops_view = new DepTimesApp.Views.BusStops({collection: stops_collection})
    $("._bus-data-container").prepend(stops_view.render().el);

    // call the showMap function
    if ($("input[name='custom_location_checkbox']").is(":checked")) {
      showMap(custom_location, stop_models)
    } else {
      if (user_location !== undefined) {
        showMap(user_location, stop_models)
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

// saves the geolocation position into global variable
function savePosition(position) {
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

// causes the map to appear, with circles and markers to indicate bus stops
function showMap(position, stop_models) {
  var mapholder, user_latlon, mapOptions, map, marker, time_now
  var marker_min_threshold = 10 * 60

  mapholder = document.getElementById('map-canvas')
  user_latlon = new google.maps.LatLng(
    position.coords.latitude,
    position.coords.longitude
  )
  mapOptions = {
    center: user_latlon,
    zoom: 17,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false,
    navigationControlOptions: {style: google.maps.NavigationControlStyle.ANDROID}
  }

  map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
  marker = new google.maps.Marker({position: user_latlon, map: map, title: "You are here!"});
  $("._map-description").show()

  // add circles to indicate which buses are leaving soon
  time_now = Date.now() // time_now is used to compare with predictions' epochTimes
  _.each(stop_models, function(model) {
    var circleOptions
    if (
      model.get("predictions")[0] &&
      model.get("predictions")[0].epochTime &&
      (parseInt(model.get("predictions")[0].epochTime) - time_now) >= 0 &&
      (parseInt(model.get("predictions")[0].epochTime) - time_now) / 1000 < marker_min_threshold
    ) {
      if (model.get("predictions").length > 0) {
        circleOptions = {
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
        cityCircle = new google.maps.Circle(circleOptions);
      }
    }
  })

  // add infoWindows to indicate time until departure
  _.each(stop_models, function(model) {
    var pos, infowindow
    if (
      model.get("predictions")[0] &&
      model.get("predictions")[0].epochTime &&
      (parseInt(model.get("predictions")[0].epochTime) - time_now) >= 0 &&
      (parseInt(model.get("predictions")[0].epochTime) - time_now) / 1000 < marker_min_threshold
    ) {
      pos = new google.maps.LatLng(
        model.get("coords").latitude,
        model.get("coords").longitude
      )
      infowindow = new google.maps.InfoWindow({
        map: map,
        position: pos,
        content: Math.floor((parseInt(model.get("predictions")[0].epochTime) - time_now) / 60000) + " min"
      });
    }
  })
}

getLocation()
