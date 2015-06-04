import numpy as np

import sys
sys.path.append('backend')
from models import Location, Stop

import math
import random
from xml.dom import minidom
import requests
from flask import Flask, jsonify, render_template, request, g
import json
import xmltodict
import inspect
import sqlite3
from contextlib import closing
import os
from scipy import spatial

app = Flask(__name__, static_folder = "../frontend")

app.config.from_envvar('DEPTIMES_CONFIG', silent=False)

# None -> cursor
# helper for connecting to database
def connect_db():
    print app.config['DATABASE']
    return sqlite3.connect(app.config['DATABASE'])

# None => None
# drops bus_stops table and creates empty table
def init_db():
    with closing(connect_db()) as db:
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

# str, list, bool => list
# query helper which executes query and returns cursor
# from flask sqlite documentation
def query_db(query, args=(), one=False):
    cur = connect_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

# list => None
# saves all stops in all_stops list to db
def store_all_stops(all_bus_stops):
    conn = connect_db()
    c = conn.cursor()
    for bus_stop in all_bus_stops:
        c.execute("insert into bus_stops values ('%s', '%s', '%s', '%s', '%s', '%s', '%s')" % (
            bus_stop.stopTag,
            bus_stop.title,
            bus_stop.lat,
            bus_stop.lon,
            bus_stop.stopId,
            bus_stop.routeTag,
            bus_stop.agency
        ))
    conn.commit()
    conn.close()

# None => list
# loads all stops from db
def load_all_stops():
    stops = []
    for bus_stop in query_db('select * from bus_stops'):
        stops.append(Stop(
            bus_stop[0],
            bus_stop[1],
            bus_stop[2],
            bus_stop[3],
            bus_stop[4],
            bus_stop[5],
            bus_stop[6],
        ))
    return stops

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
def closest_n_stops(stops, loc, n):
    def calcDistance(stop):
        return math.sqrt(math.pow(loc.lat - stop.lat, 2) + math.pow(loc.lon - stop.lon, 2))
    stops = sorted(stops, key = lambda x: calcDistance(x))
    #print "all stops length"
    #print len(all_stops)
    #print inspect.getmembers(stops[0], lambda a:not(inspect.isroutine(a)))
    return stops[0:n] 
# str, str, str => xml
def query_stop_api(agency, routeTag, stopTag):
    return requests.get('http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=' + agency + '&r=' + routeTag + '&s=' + stopTag).content

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

    closest = closest_n_stops_kdtree(all_stops_kdtree, loc, num_nearest)
    closest_stops_json = []
    for bus_stop in closest:
        stop_times = query_stop_api(bus_stop.agency, bus_stop.routeTag, bus_stop.stopTag)
        result = xmltodict.parse(stop_times)
        result["body"]["lat"] = bus_stop.lat
        result["body"]["lon"] = bus_stop.lon
        result["body"]["stopId"] = bus_stop.stopId
        bus_stop_data_json = json.dumps(result)
        closest_stops_json += [bus_stop_data_json]

    # return a json string of an array of json strings for the frontend to parse
    ret = json.dumps(closest_stops_json)
    return ret

# string, string => None
# stores route information from api into all_stops list
def get_route(routeTag, agency):
    global all_stops
    route_stops = requests.get("http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=" + agency + "&r=" + routeTag).content
    route_stops_dict = xmltodict.parse(route_stops)
    stops = []
    #print route_stops_dict
    #print route_stops_dict["body"]
    #print inspect.getmembers(route_stops_dict["body"]["route"], lambda a:not(inspect.isroutine(a)))
    for stop in route_stops_dict["body"]["route"]["stop"]:
        if "@stopId" in stop:
            title = stop["@title"]
            #title = title.replace('&amp;', '&')
            title = title.replace('\'', '\'\'') # escape ' with ''
            stops.append(Stop(stop["@tag"],
                title,
                float(stop["@lat"]),
                float(stop["@lon"]),
                stop["@stopId"],
                route_stops_dict["body"]["route"]["@tag"],
                agency
            ))
        #print inspect.getmembers(stops[len(stops) - 1], lambda a:not(inspect.isroutine(a)))
    all_stops += stops

@app.route("/get-routes")
def get_routes_wrapper():
    # TODO: specify agency
    #request.args.get('agency')
    global agency
    get_routes(agency)

# mutates
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

def refresh_db():
    global all_stops
    init_db()
    all_stops = []
    agencies = ["sf-muni", "actransit", "sf-mission-bay", "unitrans", "ucsf", "dumbarton", "emery"]
    get_all_agency_routes(agencies)
    store_all_stops(all_stops)
    print len(all_stops)

@app.route("/")
def get_index():
    return render_template('index.html')

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

if __name__ == "__main__":
    app.debug = True
    #setup first time
    #refresh_db()
    #setupend

    all_stops = []
    all_stops_kdtree = None
    load_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

