from backend import app
from models import Stop
import sqlite3

# None -> cursor
# helper for connecting to database
def connect_db():
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
# function copied from flask sqlite documentation
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
# loads all stops from db and returns as a list of Stops
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
