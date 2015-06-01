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
