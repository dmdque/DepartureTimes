from flask import Flask

app = Flask(__name__, static_folder = "../frontend")
app.config.from_envvar('DEPTIMES_CONFIG', silent=False)

import controller
