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
        console.log("done")
        console.log(data)
        var bus_data = JSON.parse(data)
        var prediction_data = bus_data.body.predictions.direction.prediction
        console.log(bus_data)

        var bus_stop_times = _.pluck(prediction_data, "@seconds")

        var stop_model = new Test.Models.BusStop({title: "test123", predictions: bus_stop_times})
        var stop_model2 = new Test.Models.BusStop({title: "test123", predictions: bus_stop_times})
        //stop_view = new Test.Views.BusStop({model: stop_model})
        //$("#test").append(stop_view.render().el);
        var models = []
        models.push(stop_model)
        models.push(stop_model2)

        console.log("models", models)
        var stops_collection = new Test.Collections.BusStops(models)
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

