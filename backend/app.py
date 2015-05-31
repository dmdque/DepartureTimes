#import numpy as np
import math
import random
from xml.dom import minidom
import requests
from flask import Flask, jsonify, render_template, request #is this the same requests?
import json
import xmltodict
import inspect
import sqlite3

DATABASE = '/tmp/flaskr.db'
DEBUG = True
SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'default'

app = Flask(__name__, static_folder = "../frontend")


class Location:
    lat    = None
    lon    = None
    def __init__(self, lat, lon):
        self.lat    = lat
        self.lon    = lon

class Stop:
    stopTag  = None
    title    = None
    lat      = None
    lon      = None
    stopId   = None
    routeTag = None
    agency   = None
    def __init__(self, stopTag, title, lat, lon, stopId, routeTag, agency):
        self.stopTag      = stopTag
        self.title    = title
        self.lat      = lat
        self.lon      = lon
        self.stopId   = stopId
        self.routeTag = routeTag
        self.agency   = agency

all_stops = []

#<route tag="2" title="2-Clement" color="000000" oppositeColor="ffffff" latMin="37.7824999" latMax="37.7944499" lonMin="-122.47308" lonMax="-122.39492">

all_stops.append(Stop(7227, "Market &amp; Steuart", 40.7944499, -122.39492, 17227))
all_stops.append(Stop(5669, "Market St &amp; Drumm St", 37.7934699, -122.39618, 15669))
all_stops.append(Stop(5671, "Market St &amp; Front St", 37.7919199, -122.39815, 15671))
all_stops.append(Stop(6606, "Sutter St &amp; Sansome St", 37.7902999, -122.40067, 16606))
all_stops.append(Stop(6596, "Sutter St &amp; Kearny St", 37.78982, -122.4043799, 16596))
all_stops.append(Stop(6611, "Sutter St &amp; Stockton St", 37.7894799, -122.40703, 16611))
all_stops.append(Stop(6604, "Sutter St &amp; Powell St", 37.7892699, -122.40868, 16604))
all_stops.append(Stop(6601, "Sutter St &amp; Mason St", 37.78906, -122.4103199, 16601))
all_stops.append(Stop(6612, "Sutter St &amp; Taylor St", 37.78886, -122.4119599, 16612))
all_stops.append(Stop(6595, "Sutter St &amp; Jones St", 37.78864, -122.4136199, 16595))
all_stops.append(Stop(6598, "Sutter St &amp; Leavenworth St", 37.78843, -122.4152699, 16598))
all_stops.append(Stop(6594, "Sutter St &amp; Hyde St", 37.7882199, -122.41691, 16594))
all_stops.append(Stop(6597, "Sutter St &amp; Larkin St", 37.78801, -122.4185399, 16597))
all_stops.append(Stop(6603, "Sutter St &amp; Polk St", 37.7877999, -122.4202, 16603))
all_stops.append(Stop(6613, "Sutter St &amp; Van Ness Ave", 37.78763, -122.4215399, 16613))
all_stops.append(Stop(6593, "Sutter St &amp; Gough St", 37.7872099, -122.42492, 16593))
all_stops.append(Stop(6602, "Sutter St &amp; Octavia St", 37.7869299, -122.42706, 16602))
all_stops.append(Stop(6599, "Sutter St &amp; Laguna St", 37.78672, -122.4287099, 16599))
all_stops.append(Stop(6587, "Sutter St &amp; Buchanan St", 37.7865799, -122.42986, 16587))
all_stops.append(Stop(6591, "Sutter St &amp; Fillmore St", 37.7861599, -122.43315, 16591))
all_stops.append(Stop(6609, "Sutter St &amp; Steiner St", 37.78594, -122.4347899, 16609))
all_stops.append(Stop(6607, "Sutter St &amp; Scott St", 37.7855199, -122.43808, 16607))
all_stops.append(Stop(6589, "Sutter St &amp; Divisadero St", 37.78531, -122.4397299, 16589))
all_stops.append(Stop(6585, "Sutter St &amp; Baker St", 37.7848899, -122.44307, 16585))
all_stops.append(Stop(6098, "Presidio Ave &amp; Sutter St", 37.78454, -122.4462, 16098))
all_stops.append(Stop(6096, "Presidio Ave &amp; Pine St", 37.78624, -122.44653, 16096))
all_stops.append(Stop(3892, "California St &amp; Presidio Ave", 37.7873299, -122.44691, 13892))
all_stops.append(Stop(3875, "California St &amp; Laurel St", 37.7869199, -122.44996, 13875))
all_stops.append(Stop(3896, "California St &amp; Spruce St", 37.7865, -122.4532799, 13896))
all_stops.append(Stop(3879, "California St &amp; Maple St", 37.7862499, -122.45521, 13879))
all_stops.append(Stop(3852, "California St &amp; Cherry St", 37.78604, -122.4568299, 13852))
all_stops.append(Stop(3644, "Arguello Blvd &amp; California St", 37.78556, -122.4592499, 13644))
all_stops.append(Stop(7250, "Clement St &amp; Arguello Blvd", 37.7832599, -122.4590999, 17250))
all_stops.append(Stop(4040, "Clement St &amp; 4th Ave", 37.7830899, -122.46257, 14040))
all_stops.append(Stop(4042, "Clement St &amp; 6th Ave", 37.783, -122.4647899, 14042))
all_stops.append(Stop(7019, "Clement St &amp; 8th Ave", 37.78289, -122.4664199, 17019))
all_stops.append(Stop(4045, "Clement St &amp; 10th Ave", 37.7827999, -122.469, 14045))
all_stops.append(Stop(4047, "Clement St &amp; 12th Ave", 37.7827, -122.4711599, 14047))
all_stops.append(Stop(37543, "Clement &amp; 14 Ave", 37.7824999, -122.47308, 137543))
all_stops.append(Stop(7543, "Clement &amp; 14 Ave", 37.7824999, -122.47308, 17543))
all_stops.append(Stop(4048, "Clement St &amp; 12th Ave", 37.7825799, -122.47097, 14048))
all_stops.append(Stop(4046, "Clement St &amp; 10th Ave", 37.7826999, -122.46837, 14046))
all_stops.append(Stop(4044, "Clement St &amp; 8th Ave", 37.7827999, -122.46616, 14044))
all_stops.append(Stop(4043, "Clement St &amp; 6th Ave", 37.7828599, -122.46433, 14043))
all_stops.append(Stop(4041, "Clement St &amp; 4th Ave", 37.7829899, -122.46195, 14041))
all_stops.append(Stop(4039, "Clement St &amp; 2nd Ave", 37.78309, -122.4598199, 14039))
all_stops.append(Stop(3647, "Arguello Blvd &amp; Euclid Ave", 37.78374, -122.45896, 13647))
all_stops.append(Stop(3846, "California St &amp; Arguello Blvd", 37.78566, -122.4590399, 13846))
all_stops.append(Stop(3853, "California St &amp; Cherry St", 37.78597, -122.4563299, 13853))
all_stops.append(Stop(3897, "California St &amp; Spruce St", 37.78633, -122.4535199, 13897))
all_stops.append(Stop(3876, "California St &amp; Laurel St", 37.7867099, -122.45026, 13876))
all_stops.append(Stop(3893, "California St &amp; Presidio Ave", 37.7871499, -122.44688, 13893))
all_stops.append(Stop(6097, "Presidio Ave &amp; Pine St", 37.7863299, -122.4467599, 16097))
all_stops.append(Stop(6605, "Sutter St &amp; Presidio Ave", 37.78438, -122.44617, 16605))
all_stops.append(Stop(6586, "Sutter St &amp; Baker St", 37.7847699, -122.44331, 16586))
all_stops.append(Stop(6590, "Sutter St &amp; Divisadero St", 37.78526, -122.4394299, 16590))
all_stops.append(Stop(6608, "Sutter St &amp; Scott St", 37.7853999, -122.43832, 16608))
all_stops.append(Stop(6610, "Sutter St &amp; Steiner St", 37.78579, -122.4350299, 16610))
all_stops.append(Stop(6592, "Sutter St &amp; Fillmore St", 37.7860899, -122.43283, 16592))
all_stops.append(Stop(6588, "Sutter St &amp; Buchanan St", 37.7865, -122.4296099, 16588))
all_stops.append(Stop(6600, "Sutter St &amp; Laguna St", 37.78665, -122.4284599, 16600))
all_stops.append(Stop(6018, "Post St &amp; Laguna St", 37.78577, -122.42767, 16018))
all_stops.append(Stop(6020, "Post St &amp; Octavia St", 37.7859099, -122.42665, 16020))
all_stops.append(Stop(6124, "Post St &amp; Gough St", 37.7861199, -122.42498, 16124))
all_stops.append(Stop(6024, "Post St &amp; Van Ness Ave", 37.7865799, -122.42145, 16024))
all_stops.append(Stop(6021, "Post St &amp; Polk St", 37.7867999, -122.41956, 16021))
all_stops.append(Stop(6016, "Post St &amp; Larkin St", 37.7870499, -122.41772, 16016))
all_stops.append(Stop(6126, "Post St &amp; Hyde St", 37.7872399, -122.41626, 16126))
all_stops.append(Stop(6017, "Post St &amp; Leavenworth St", 37.78745, -122.4145899, 16017))
all_stops.append(Stop(6127, "Post St &amp; Jones St", 37.7876499, -122.41295, 16127))
all_stops.append(Stop(6023, "Post St &amp; Taylor St", 37.7878799, -122.41132, 16023))
all_stops.append(Stop(6022, "Post St &amp; Powell St", 37.7882999, -122.40793, 16022))
all_stops.append(Stop(6125, "Post St &amp; Grant Ave", 37.78855, -122.4059899, 16125))
all_stops.append(Stop(6019, "Post St &amp; Montgomery St", 37.7890099, -122.40238, 16019))
all_stops.append(Stop(7264, "Market St &amp; 1st St", 37.7909399, -122.39919, 17264))
all_stops.append(Stop(5658, "Market St &amp; Beale St", 37.79257, -122.3970199, 15658))
all_stops.append(Stop(6475, "Spear &amp; Market St", 37.79359, -122.39555, 16475))
all_stops.append(Stop(37227, "Market &amp; Steuart", 37.7944499, -122.39492, 137227))
all_stops.append(Stop(4826, "Kearny St &amp; Sutter St", 37.7897499, -122.4037199, 14826))
all_stops.append(Stop(3815, "Bush St &amp; Montgomery St", 37.79096, -122.4020799, 13815))
all_stops.append(Stop(36606, "Sutter St &amp; Sansome St", 37.7902999, -122.40067, 136606))

def closestNStops(stops, loc, n):
    # calculates pythagorean distance between stop and loc
    def calcDistance(stop):
        return math.sqrt(math.pow(loc.lat - stop.lat, 2) + math.pow(loc.lon - stop.lon, 2))

    stops = sorted(stops, key = lambda x: calcDistance(x))
    return stops[0:n]

# TODO
# allow for location input in url?
# return a json
@app.route('/get-closest')
def get_data():
    print "request"
    print request.args.get('test')
    print request.args.get('location[coords][latitude]')
    print request.query_string
    print request.url
    loc = Location(float(request.args.get('location[coords][latitude]')), float(request.args.get('location[coords][longitude]')))
    num_nearest = int(request.args.get('num_nearest'))
    closest = get_closest(loc, num_nearest)

    closest_stops_json = []
    for bus_stop in closest:
        stop_times = requests.get("http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=ttc&stopId=" + str(bus_stop.stopId)).content
        result = xmltodict.parse(stop_times)
        bus_stop_data_json = json.dumps (result)
        closest_stops_json += [bus_stop_data_json]

    # note that we will have a jsonified array of json strings for the frontend to parse
    ret = json.dumps(closest_stops_json)
    #print ret
    return ret

    #closest = closest[0]

    ## TODO: change url to abstracted layer, using constant base string and query string params

    ## TODO: do this for all n closest bus stops
    #bus_times = requests.get("http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=sf-muni&stopId=" + str(closest.stopId)).content
    #xmldoc = minidom.parseString(bus_times)
    #itemlist = xmldoc.getElementsByTagName('prediction')
    #print(len(itemlist))
    #print(itemlist[0].attributes['seconds'].value)
    #str1 = ""
    #for s in itemlist:
        #print(s.attributes['seconds'].value)
        #str1 += str(s.attributes['seconds'].value) + "\n"

    ##xl = file('test.xml')
    ##xl = minidom.parseString(bus_times)
    #result = xmltodict.parse(bus_times)
    #data_json = json.dumps (result)
    #return data_json


    #return str1

def get_closest(loc, n):
    closest = closestNStops(all_stops, loc, n)
    print "all stops length"
    print len(all_stops)
    print inspect.getmembers(closest[0], lambda a:not(inspect.isroutine(a)))
    return closest

# single route for now
# TODO: specify the route in query params
@app.route("/get-route")
def get_route_wrapper():
    routeTag = "54" # TODO: this is temporary
    get_route(routeTag)

def get_route(routeTag):
    global all_stops
    route_stops = requests.get("http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=ttc&r=" + routeTag).content
    route_stops_dict = xmltodict.parse(route_stops)
    stops = []
    #print route_stops_dict
    #print route_stops_dict["body"]
    for stop in route_stops_dict["body"]["route"]["stop"]:
        if "@stopId" in stop:
            stops.append(Stop(stop["@tag"], stop["@title"], float(stop["@lat"]), float(stop["@lon"]), stop["@stopId"]))
    all_stops += stops

    route_stops_json = json.dumps (route_stops_dict)
    return route_stops_json

# TODO: specify agency
@app.route("/get-routes")
def get_routes():
    routes = requests.get("http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=ttc").content
    routes_dict = xmltodict.parse(routes)
    #print inspect.getmembers(routes_dict["body"], lambda a:not(inspect.isroutine(a)))
    i = 0
    for route in routes_dict["body"]["route"]:
        if i > 5:
            break
        get_route(route["@tag"])
        print i
        i += 1
    return "hi"


@app.route("/")
def show_todos():
    return render_template('departure-times.html')


if __name__ == "__main__":
    app.debug = True
    app.run()

