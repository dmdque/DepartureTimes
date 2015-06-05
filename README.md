#DepartureTimes
DepartureTimes gives real-time departure time for public transportation. It geolocalizes the user and displays arrival times for the nearest bus stops in a table and on a map.

##Demo
https://still-gorge-3020.herokuapp.com

##Stack Choice
For this project, I chose to work with Flask, Backbone, and SQLite.

I chose Python both because it was recommended, and because of its ease of use.
Python has a large community behind it, many libraries are available, and it's a pleasure to write code without semicolons or curly braces.

When deciding what framework to use, I briefly looked at Pyramid, Flask, and Django. Although I've never used Flask before this project, I decided it was the best option since it's both lightweight and popular.

I chose Backbone because it was recommended and because it's flexible.

I decided to use SQLite because this project doesn't require anything more powerful. It's also lightweight, as the name suggests.

##Notes
All code was written by myself, with the following exceptions:
- [generator-backbone](https://github.com/yeoman/generator-backbone) was used for the Backbone boilerplate and as an inspiration for the frontend folder structure
- the init_db() and query_db() helper functions were copied from the Flask documentation

Other notes:
- a bus stop cache timeouts when it's older than 10 minutes
- the first request is slow due to the API bottleneck, but subsequent requests are fast
- a user is considered too far away if they're more than 10km from any bus stop


##Todo:
- implement timer for UI to update bus times
- limit stops cache to a couple hundred stops so that it doesn't eat up too much memory
- write tests
