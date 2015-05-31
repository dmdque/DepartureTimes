var x = document.getElementById("demo");
console.log("hello world")
var data = {
    "location": {
        "coords": {
            "latitude": 40.7944499,
            "longitude": -122.39492
        }
    },
    "test": "tests"
}
var bus_data
var getDepartureTimes = function () {
    console.log("getDepartureTimes")
    if ($("input[name='custom_location']").is(":checked")) {
        console.log("custom")
        custom_location = {
            "coords": {
                "latitude": $("input#lat").val(),
                "longitude": $("input#lon").val()
            }
        }
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

        console.log(_.map(bus_data_list, function (bus_data) { return bus_data.body.predictions }))
        var prediction_data_list = _.map(bus_data_list, function (bus_data) {
            var preds = [] // TODO: rename
            if (bus_data.body.predictions.constructor === Array) {
                _.each(bus_data.body.predictions, function (prediction) {
                    if (prediction.direction == undefined) {
                        // TODO: handle or get rid
                    } else if (prediction.direction.prediction.constructor === Array) { // not undefined
                        _.each(prediction.direction.prediction, function (prediction2) {
                            console.log("prediction2", prediction2)
                            var micro = {
                                // TODO: should these have title in them?
                                agencyTitle: prediction["@agencyTitle"],
                                routeTitle: prediction["@routeTitle"],
                                stopTag: prediction["@stopTag"],
                                stopTitle: prediction["@stopTitle"],
                                direction: prediction.direction["@title"],
                                epochTime: prediction2["@epochTime"],
                                seconds: prediction2["@seconds"]
                            }
                            preds.push(micro)
                            if (micro.seconds == undefined || micro.agencyTitle == undefined) { debugger }
                        })
                    } else { // if (prediction.direction && prediction.direction["@epochTime"]) {
                        if (prediction.direction.prediction.constructor === Array) {
                            _.each(prediction.direction.prediction, function (prediction2) {
                                var micro = {
                                    // TODO: should these have title in them?
                                    agencyTitle: prediction["@agencyTitle"],
                                    routeTitle: prediction["@routeTitle"],
                                    stopTag: prediction["@stopTag"],
                                    stopTitle: prediction["@stopTitle"],
                                    direction: prediction.direction["@title"],
                                    epochTime: prediction2["@epochTime"],
                                    seconds: prediction2["@seconds"]
                                }
                                preds.push(micro)
                                // TODO: remove this debugging
                            if (micro.seconds == undefined || micro.agencyTitle == undefined) { debugger }
                            })
                        } else {
                            var micro = {
                                // TODO: should these have title in them?
                                agencyTitle: prediction["@agencyTitle"],
                                routeTitle: prediction["@routeTitle"],
                                stopTag: prediction["@stopTag"],
                                stopTitle: prediction["@stopTitle"],
                                direction: prediction.direction["@title"],
                                epochTime: prediction.direction.prediction["@epochTime"],
                                seconds: prediction.direction.prediction["@seconds"]
                            }
                            preds.push(micro)
                            // TODO: remove this debugging
                            if (micro.seconds == undefined || micro.agencyTitle == undefined) { debugger }
                        }
                    }
                })
                return preds
            // special case when there is only one prediction
            } else if (bus_data && bus_data.body && bus_data.body.predictions && bus_data.body.predictions.direction && bus_data.body.predictions.direction.prediction) {
                if (bus_data.body.predictions.direction.prediction.constructor === Array) {
                    _.each(bus_data.body.predictions.direction.prediction, function (prediction2) {
                        var micro = {
                            // TODO: should these have title in them?
                            agencyTitle: bus_data.body.predictions["@agencyTitle"], routeTitle: bus_data.body.predictions.direction.prediction["@routeTitle"],
                            stopTag: bus_data.body.predictions["@stopTag"],
                            stopTitle: bus_data.body.predictions["@stopTitle"],
                            direction: bus_data.body.predictions.direction["@title"],
                            epochTime: prediction2["@epochTime"],
                            seconds: prediction2["@seconds"]
                        }
                        preds.push(micro)
                        // TODO: remove this debugging
                        if (micro.seconds == undefined || micro.agencyTitle == undefined) { debugger }
                    })
                    return preds
                } else {
                    var micro = {
                        agencyTitle: bus_data.body.predictions["@agencyTitle"],
                        routeTitle: bus_data.body.predictions["@routeTitle"],
                        stopTag: bus_data.body.predictions["@stopTag"],
                        stopTitle: bus_data.body.predictions["@stopTitle"],
                        direction: bus_data.body.predictions.direction["@title"],
                        epochTime: bus_data.body.predictions.direction.prediction["@epochTime"],
                        seconds: bus_data.body.predictions.direction.prediction["@seconds"]
                    }
                    if (micro.seconds == undefined || micro.agencyTitle == undefined) { debugger }
                    return [micro]
                }
            } else {
                // TODO: handle when no directions
            }
        })
        console.log(prediction_data_list)

        var stop_models = []
        // TODO: sort each prediction_data
        // TODO: sort collection based on nearest time
        _.map(prediction_data_list, function (prediction_data) {
            var stopTitle = ""
            var stopTag = null
            if (prediction_data && prediction_data[0] && prediction_data[0].stopTitle) {
                stopTitle = prediction_data[0].stopTitle
            }
            if (prediction_data && prediction_data[0] && prediction_data[0].stopTag) {
                stopTag = prediction_data[0].stopTag
            }
            var stop_model = new Test.Models.BusStop({"title": stopTitle, "predictions": prediction_data, "stopTag": stopTag})
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

    console.log("lat and lon: ", lat, lon, position)
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

