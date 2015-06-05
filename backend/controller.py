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
cache_timeout = 10 * 60

nextbus_api_url_base = 'http://webservices.nextbus.com/service/publicXMLFeed'
all_stops_list = []
all_stops_kdtree = None

@app.route('/')
def get_index():
    return render_template('index.html')

# None -> jsonstring | str
# calculates num_nearest closest stops by querying NextBus API, and sends the
# data back to the client
# returns 'distance error' if user location is too far away from bus stops
@app.route('/get-closest')
def get_closest():
    global all_stops_list
    global all_stops_kdtree
    num_nearest = int(request.args.get('num_nearest'))
    loc = Location(
        float(request.args.get('location[coords][latitude]')),
        float(request.args.get('location[coords][longitude]'))
    )

    # load stops into memory if not already done so
    if all_stops_kdtree == None:
        load_db()

    closest = closest_n_stops_kdtree(all_stops_kdtree, loc, num_nearest)
    if closest == None:
        return 'distance error'

    closest_stops_json = []
    cache_miss_count = 0 # for testing purposes
    for bus_stop in closest:
        time_now = time.time()
        print bus_stop.stopId
        bus_key = bus_stop.stopTag + bus_stop.routeTag

        if bus_key in cache_stops and (time_now - cache_stops[bus_key]['cache_time']) < cache_timeout:
            closest_stops_json += [cache_stops[bus_key]['data']]
        else:
            if bus_key in cache_stops:
                print time_now - cache_stops[bus_key]['cache_time']
            cache_miss_count += 1
            cache_time = time.time()

            stop_times = query_stop_api(bus_stop.agency, bus_stop.routeTag, bus_stop.stopTag)
            result = xmltodict.parse(stop_times)
            # add metadata to cached stop
            result['body']['lat'] = bus_stop.lat
            result['body']['lon'] = bus_stop.lon
            result['body']['stopId'] = bus_stop.stopId
            bus_stop_data_json = json.dumps(result)
            closest_stops_json += [bus_stop_data_json]

            # we cache the bus stop as a json and a timestamp
            cache_stops[bus_key] = {
                'data': bus_stop_data_json,
                'cache_time': cache_time
            }

    print 'cache miss count:'
    print cache_miss_count
    # return a json of an array of jsons for the frontend to parse
    return json.dumps(closest_stops_json)

# KDTree, Location, int => list | None
# uses kdtree to determine closest bus stops
# returns None is user is too far away
def closest_n_stops_kdtree(stops_kdtree, loc, n):
    user_loc = [loc.lat, loc.lon]
    distances, closest_indecies = stops_kdtree.query(user_loc, n)
    if distances[0] > 0.1: # 0.1 degrees is about 10km
        return None
    # note that this kdtree implementation can only handle sets of points (no
    # metadata) thus we use the returned indecies to get the actual stop data
    def get_stop_at_index(i):
      return all_stops_list[i]
    closest_stops = map(get_stop_at_index, closest_indecies)
    return closest_stops

# list, Location, int => list
# returns the n closest stops
# replaced by closest_n_stops_kdtree
def closest_n_stops(stops, loc, n):
  # calculates pythagorean distance between stop and loc
    def calcDistance(stop):
        return math.sqrt(math.pow(loc.lat - stop.lat, 2) + math.pow(loc.lon - stop.lon, 2))
    stops = sorted(stops, key = lambda x: calcDistance(x))
    return stops[0:n]

# str, str, str => xml
# queries NextBus API for information about a route-specific bus stop
def query_stop_api(agency, routeTag, stopTag):
    return requests.get(nextbus_api_url_base + '?command=predictions&a=' + agency + '&r=' + routeTag + '&s=' + stopTag).content

# string, string => None
# downloads and stores route information from API into all_stops_list
def get_route(routeTag, agency):
    global all_stops_list
    response = requests.get(nextbus_api_url_base + '?command=routeConfig&a=' + agency + '&r=' + routeTag).content
    route_stops = xmltodict.parse(response)
    stops = []
    for stop in route_stops['body']['route']['stop']:
        if '@stopId' in stop:
            title = stop['@title']
            title = title.replace('\'', '\'\'') # escape ' with '' for SQL
            stops.append(Stop(
                stop['@tag'],
                title,
                float(stop['@lat']),
                float(stop['@lon']),
                stop['@stopId'],
                route_stops['body']['route']['@tag'],
                agency
            ))
    all_stops_list += stops

# str => None
# downloads agency's route information from NextBus API
def get_routes(agency):
    routes = requests.get(nextbus_api_url_base + '?command=routeList&a=' + agency).content
    routes_dict = xmltodict.parse(routes)
    for route in routes_dict['body']['route']:
        get_route(route['@tag'], agency)

# [str] => None
# downloads all specified agency route information from NextBus API
def get_all_agency_routes(agencies):
    for agency in agencies:
        get_routes(agency)

# None => None
# downloads all route information
# all bus stops are written to database and saved in all_stops_list
def refresh_db():
    global all_stops_list
    init_db()
    all_stops_list = []
    # these are the agencies in the Northen-California area
    agencies = ['sf-muni', 'actransit', 'sf-mission-bay', 'unitrans', 'ucsf', 'dumbarton', 'emery']
    get_all_agency_routes(agencies)
    store_all_stops(all_stops_list)
    print "number of stops stored in database"
    print len(all_stops_list)

# None => None
# loads all stops from database and stores it in all_stops_list
def load_db():
    global all_stops_list
    global all_stops_kdtree
    all_stops_list = []
    all_stops_list = load_all_stops()
    def extract_coords(bus_stop):
        return [bus_stop.lat, bus_stop.lon]
    all_stops_kdtree = spatial.KDTree(map(extract_coords, all_stops_list))

    print "number of stops loaded from database"
    print len(all_stops_list)

## first-time db set up
#refresh_db()

load_db()
