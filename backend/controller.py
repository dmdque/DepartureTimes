from backend import app

from models import Location, Stop
from database import *

from flask import Flask, jsonify, render_template, request, g
import sys
import math
import random
from xml.dom import minidom
import requests
import json
import xmltodict
import inspect
from contextlib import closing
from scipy import spatial
import time

cache_limit = 100
cache_stops = {}
cache_timeout = 5 * 60

all_stops = []
all_stops_kdtree = None

@app.route("/")
def get_index():
    return render_template('index.html')

# None -> JSONstring
# calculates num_nearest closest stops by querying NextBus API, and sends the
# data back to the client
@app.route('/get-closest')
def get_closest():
    global all_stops
    global all_stops_kdtree
    loc = Location(
        float(request.args.get('location[coords][latitude]')),
        float(request.args.get('location[coords][longitude]'))
    )
    num_nearest = int(request.args.get('num_nearest'))

    if all_stops_kdtree == None:
        load_db()

    print "num_nearest"
    print num_nearest
    closest = closest_n_stops_kdtree(all_stops_kdtree, loc, num_nearest)

    def extract_stopId(bus_stop):
        return [bus_stop.stopId, bus_stop.routeTag]

    closest_stops_json = []
    miss_count = 0 # for testing purposes
    print len(closest)
    for bus_stop in closest:
        time_now = time.time()
        print bus_stop.stopId
        if (bus_stop.stopTag + bus_stop.routeTag) in cache_stops and time_now - cache_stops[bus_stop.stopTag + bus_stop.routeTag]['cache_time'] < cache_timeout:
            closest_stops_json += [cache_stops[bus_stop.stopTag + bus_stop.routeTag]['data']]
            print time_now - cache_stops[bus_stop.stopTag + bus_stop.routeTag]['cache_time']
        else:
            if (bus_stop.stopTag + bus_stop.routeTag) in cache_stops:
                print time_now - cache_stops[bus_stop.stopTag + bus_stop.routeTag]['cache_time']
            miss_count += 1
            cache_time = time.time()
            stop_times = query_stop_api(bus_stop.agency, bus_stop.routeTag, bus_stop.stopTag)
            result = xmltodict.parse(stop_times)
            result["body"]["lat"] = bus_stop.lat
            result["body"]["lon"] = bus_stop.lon
            result["body"]["stopId"] = bus_stop.stopId
            bus_stop_data_json = json.dumps(result)
            closest_stops_json += [bus_stop_data_json]

            cache_stops[bus_stop.stopTag + bus_stop.routeTag] = {
                'data': bus_stop_data_json,
                'cache_time': cache_time
            }

    print "miss count:"
    print miss_count
    # return a json string of an array of json strings for the frontend to parse
    ret = json.dumps(closest_stops_json)
    return ret

# KDTree, Location, int => list
# calculates pythagorean distance between stop and loc
def closest_n_stops_kdtree(stops_kdtree, loc, n):
    point = [loc.lat, loc.lon]
    closest_indecies = stops_kdtree.query(point, n)[1]
    def get_stop_at_index(i): return all_stops[i]
    closest_stops = map(get_stop_at_index, closest_indecies)
    return closest_stops

# list, Location, int => list
# calculates pythagorean distance between stop and loc
# replaced by closest_n_stops_kdtree
def closest_n_stops(stops, loc, n):
    def calcDistance(stop):
        return math.sqrt(math.pow(loc.lat - stop.lat, 2) + math.pow(loc.lon - stop.lon, 2))
    stops = sorted(stops, key = lambda x: calcDistance(x))
    return stops[0:n]

# str, str, str => xml
# queries NextBus API for information about a route-specific bus stop
def query_stop_api(agency, routeTag, stopTag):
    return requests.get('http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=' + agency + '&r=' + routeTag + '&s=' + stopTag).content

# string, string => None
# stores route information from api into all_stops list
def get_route(routeTag, agency):
    global all_stops
    route_stops = requests.get("http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=" + agency + "&r=" + routeTag).content
    route_stops_dict = xmltodict.parse(route_stops)
    stops = []
    for stop in route_stops_dict["body"]["route"]["stop"]:
        if "@stopId" in stop:
            title = stop["@title"]
            title = title.replace('\'', '\'\'') # escape ' with '' for SQL
            stops.append(Stop(stop["@tag"],
                title,
                float(stop["@lat"]),
                float(stop["@lon"]),
                stop["@stopId"],
                route_stops_dict["body"]["route"]["@tag"],
                agency
            ))
    all_stops += stops

# str => None
# downloads agency's route information from NextBus API
def get_routes(agency):
    routes = requests.get("http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=" + agency).content
    routes_dict = xmltodict.parse(routes)
    i = 0
    for route in routes_dict["body"]["route"]:
        #if i > 5:
            #break
        get_route(route["@tag"], agency)
        print i
        i += 1

def get_all_agency_routes(agencies):
    for agency in agencies:
        get_routes(agency)

# None => None
# downloads all route information
# all bus stops are written to database and saved in all_stops
def refresh_db():
    global all_stops
    init_db()
    all_stops = []
    agencies = ["sf-muni", "actransit", "sf-mission-bay", "unitrans", "ucsf", "dumbarton", "emery"]
    get_all_agency_routes(agencies)
    store_all_stops(all_stops)
    #print len(all_stops)

# None => None
# loads all stops from database and stores it in all_stops
def load_db():
    global all_stops
    global all_stops_kdtree
    all_stops = []
    all_stops = load_all_stops()
    def extract_coords(bus_stop):
        return [bus_stop.lat, bus_stop.lon]
    all_stops_kdtree = spatial.KDTree(map(extract_coords, all_stops))

    print len(all_stops)

## first-time db set up
#refresh_db()

load_db()
