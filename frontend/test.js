var x = document.getElementById("demo");
var data = {
    "location": {
        "coords": {
            "latitude": 40.7944499,
            "longitude": -122.39492
        }
    },
    "num_nearest": 5
}
var bus_data
var getDepartureTimes = function () {
    if ($("input[name='custom_location']").is(":checked")) {
        custom_location = {
            "coords": {
                "latitude": $("input#lat").val(),
                "longitude": $("input#lon").val()
            }
        }
        data.location = custom_location
        showPosition(custom_location)
    } else {
        getLocation()
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
        _.each(bus_data_list, function (bus_data) {
        })
        console.log(bus_data_list)

        console.log(_.map(bus_data_list, function (bus_data) { return bus_data.body.predictions }))
        var prediction_data_list = _.map(bus_data_list, function (bus_data) {
            var preds = [] // TODO: rename
            // TODO* handle case where there are no directions by displaying route info and no times
            var handle_predictions = function (predictions) {
                var handle_prediction = function (prediction) {
                    var handle_direction = function (direction) {
                        var handle_prediction2 = function (prediction2) {
                            var micro = {
                                // TODO: should these have title in them?
                                agencyTitle: prediction["@agencyTitle"],
                                routeTag: prediction["@routeTag"],
                                routeTitle: prediction["@routeTitle"],
                                stopTag: prediction["@stopTag"],
                                stopTitle: prediction["@stopTitle"],
                                direction: direction["@title"],
                                epochTime: prediction2["@epochTime"],
                                seconds: prediction2["@seconds"]
                            }
                            preds.push(micro)
                            // TODO: remove this debugging
                            if (micro.seconds == undefined || micro.agencyTitle == undefined) { debugger }
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
                        if (predictions.constructor !== Array) {
                            var micro = {
                                agencyTitle: prediction["@agencyTitle"],
                                routeTag: prediction["@routeTag"],
                                routeTitle: prediction["@routeTitle"],
                                stopTag: prediction["@stopTag"],
                                stopTitle: prediction["@stopTitle"]
                            }
                            preds.push(micro)
                        }
                    }
                }
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
            return preds
        })
        console.log(prediction_data_list)

        var stop_models = []
        // TODO: sort each prediction_data
        // TODO: sort collection based on nearest time
        _.map(prediction_data_list, function (prediction_data) {
            var stopTitle = ""
            var direction = null
            var stopTag = null
            var routeTitle = null
            if (prediction_data && prediction_data[0] && prediction_data[0].stopTitle) {
                stopTitle = prediction_data[0].stopTitle
            }
            if (prediction_data && prediction_data[0] && prediction_data[0].stopTag) {
                stopTag = prediction_data[0].stopTag
            }
            if (prediction_data && prediction_data[0] && prediction_data[0].direction) {
                direction = prediction_data[0].direction
            }
            if (prediction_data && prediction_data[0] && prediction_data[0].routeTag) {
                routeTag = prediction_data[0].routeTag
            }
            if (prediction_data && prediction_data[0] && prediction_data[0].routeTitle) {
                routeTitle = prediction_data[0].routeTitle
            }
            var stop_model = new Test.Models.BusStop({
                "title": stopTitle,
                "predictions": prediction_data,
                "direction": direction,
                "stopTag": stopTag,
                "routeTag": routeTag,
                "routeTitle": routeTitle
            })
            stop_models.push(stop_model)
        })
        var stops_collection = new Test.Collections.BusStops(stop_models)
        var stops_view = new Test.Views.BusStops({collection: stops_collection})
        $("#test").append(stops_view.render().el);
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
    mapholder = document.getElementById('mapholder')
    mapholder.style.height = '250px';
    mapholder.style.width = '500px';

    var myOptions = {
    center:latlon,zoom:14,
    mapTypeId:google.maps.MapTypeId.ROADMAP,
    mapTypeControl:false,
    navigationControlOptions:{style:google.maps.NavigationControlStyle.SMALL}
    }

    var map = new google.maps.Map(document.getElementById("mapholder"), myOptions);
    var marker = new google.maps.Marker({position:latlon,map:map,title:"You are here!"});

    var bus_position = {
        "coords": {
            "latitude": 37.79096,
            "longitude": -122.4020799,
        }
    }
    var pos = new google.maps.LatLng(bus_position.coords.latitude,
                                     bus_position.coords.longitude)
    var infowindow = new google.maps.InfoWindow({
        map: map,
        pos: pos,
        content: 'Bush St & Montgomery St'
    });

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

