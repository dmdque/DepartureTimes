drop table if exists bus_stops;
create table bus_stops (
  stopTag text,
  title text,
  lat real not null,
  lon real not null,
  stopId text,
  routeTag text,
  agency text,
  primary key (agency, routeTag, stopTag)
);
