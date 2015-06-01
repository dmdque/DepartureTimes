#import numpy as np

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

app = Flask(__name__, static_folder = "../frontend")

app.config.from_envvar('DEPTIMES_CONFIG', silent=False)

def connect_db():
    print app.config['DATABASE']
    return sqlite3.connect(app.config['DATABASE'])

def init_db():
    with closing(connect_db()) as db:
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

@app.before_request
def before_request():
    g.db = connect_db()

@app.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()

# from flask sqlite documentation
def query_db(query, args=(), one=False):
    cur = connect_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

def insert(table, fields=(), values=()):
    # g.db is the database connection
    conn = connect_db()
    c = conn.cursor()
    query = 'INSERT INTO %s (%s) VALUES (%s)' % (
        table,
        ', '.join(fields),
        ', '.join(['?'] * len(values))
    )
    c.execute(query, values)
    conn.commit()
    conn.close()
    #return id

def insert_test2():
    conn = connect_db()
    c = conn.cursor()
    c.execute("insert into bus_stops values ('7228', 'Market Steuart', '40.7944499', '-122.39492', '17227', '2', 'sf-muni')")
    conn.commit()
    conn.close()
    return "success"

def store_all_stops(all_bus_stops):
    conn = connect_db()
    c = conn.cursor()
    for bus_stop in all_bus_stops:
        print bus_stop.stopTag,
        print bus_stop.title,
        print bus_stop.lat,
        print bus_stop.lon,
        print bus_stop.stopId,
        print bus_stop.routeTag,
        print bus_stop.agency
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
    return "complete"

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

#with app.app_context():
    ##insert_test2()
    #print "insert"
    #insert("bus_stops", ["stopTag", "title", "lat", "lon", "stopId", "routeTag", "agency"], ['7232', 'M4rket Steuart', '40.7944499', '-122.39492', '17227', '3', 'sf-mauni'])
    #print "insertend"

def closestNStops(stops, loc, n):
    # calculates pythagorean distance between stop and loc
    def calcDistance(stop):
        return math.sqrt(math.pow(loc.lat - stop.lat, 2) + math.pow(loc.lon - stop.lon, 2))

    stops = sorted(stops, key = lambda x: calcDistance(x))
    return stops[0:n]

agency = "sf-muni"
# TODO
# allow for location input in url?
# return a json
@app.route('/get-closest')
def get_data():
    global agency
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
        stop_times = requests.get("http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=" + agency + "&stopId=" + str(bus_stop.stopId)).content
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
    global agency
    get_route(routeTag, agency)

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

    route_stops_json = json.dumps (route_stops_dict)
    return route_stops_json

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
    return "hi"

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
def show_todos():
    return render_template('departure-times.html')

@app.route("/load-db")
def load_db():
    global all_stops
    all_stops = []
    all_stops = load_all_stops()
    return "complete"

if __name__ == "__main__":
    app.debug = True
    #setup first time
    #refresh_db()
    #setupend

    all_stops = []
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

