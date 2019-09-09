//
// Variables
//
var express = require("express");
var cookieParser = require('cookie-parser');
var crypto = require('crypto');
var Zigate = require('node-zigate');

var settings = require("./data/settings.json");
var devicesPath = "./data/devices.json";

// Express configuration
var app = express();
app.set('view engine', 'ejs')
app.use(express.static('public'));
app.use(cookieParser());
app.use(express.urlencoded());
app.use(express.static(__dirname + '/node_modules/bootstrap/dist'));
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
//
// Zigate Configuration
//
let coordinator = new Zigate.Coordinator({
  log: "console",
  loadsavepath: devicesPath
});
coordinator.start("/dev/ttyAMA0");

coordinator.on('inclusion_start', function() {
  console.log("MGR ::: Start Inclusion");
})
coordinator.on('inclusion_stop', function() {
  console.log("MGR ::: Stop Inclusion");
})
coordinator.on('device_add', function(d) {
  console.log("MGR ::: Device added", d);
  coordinator.queryEndpoints(d);


})
coordinator.on('endpoint_add', function(e) {
  console.log("MGR ::: Endpoint added", e);
  coordinator.queryClusters(e);
});
/*
coordinator.on('cluster_add', function(c) {
		console.log("MGR ::: Cluster added",c);
		coordinator.queryAttributes(c);
});*/


coordinator.on('device_remove', function() {
  console.log("MGR ::: Device removed");
})
coordinator.on('start', function() {
  console.log("MGR ::: Start", coordinator.devices);
})

//
// UI Routes
//
app.get("/", (req, res, next) => {
  res.render('index');
});

app.get("/overview", (req, res, next) => {
  if (tokenExists(req)) {
    let devices = require(devicesPath);
    res.render("overview", {
      "data": {
        "devices": devices,
        "relative": "../"
      }
    });
  } else {
    res.render("index");
  }
});

app.post("/overview", (req, res, next) => {
  if (req.body && req.body.username && req.body.username === settings.credentials.username && req.body.password && req.body.password === settings.credentials.password) {
    let devices = require(devicesPath);
    crypto.randomBytes(24, function(err, buffer) {
      let token = buffer.toString('hex');
      res.cookie('zigate_app_token', token, {
        maxAge: 9000000000,
        httpOnly: true,
        secure: true
      });
      res.append('Set-Cookie', 'zigate_app_token=' + token + ';');
      res.render("overview", {
        "data": {
          "devices": devices,
          "relative": "../"
        }
      });
    });
  } else {
    res.render("index");
  }
});

//Start device pairing process
app.get("/inclusion/start", (req, res, next) => {
  if (tokenExists(req)) {
    coordinator.startInclusion(30);
    console.log("ICIIC");
    let devices = require(devicesPath);
    res.render("overview", {
      "data": {
        "devices": devices,
        "alert": {
          "message": "Démarrage du mode inclusion!!",
          "type": "warning"
        },
        "relative": "../../"
      }
    });
  } else {
    res.json("access is denied");
  }
});

//Stop device pairing process
app.get("/inclusion/stop", (req, res, next) => {
  if (tokenExists(req)) {
    let devices = require(devicesPath);
    coordinator.queryDevices();
    res.render("overview", {
      "data": {
        "devices": devices,
        "alert": {
          "message": "Arrêt du mode inclusion!!",
          "type": "warning"
        },
        "relative": "../../"
      }
    });
  } else {
    res.json("access is denied");
  }
});

//Get infos about your zigate (status, devices, etc)
app.get("/infos", (req, res, next) => {
  if (tokenExists(req)) {
    res.json(["Tony", "Lisa", "Michael", "Ginger", "Food"]);
  } else {
    res.json("access is denied");
  }
});

//Get specific device informations
app.get("/device/:deviceId", (req, res, next) => {
  if (tokenExists(req)) {
    res.json(["Tony", "Lisa", "Michael", "Ginger", "Food"]);
  } else {
    res.json("access is denied");
  }
});
//Get specific device informations
app.get("/device/:deviceId/:command", (req, res, next) => {
  if (tokenExists(req)) {
    let devices = require(devicesPath);
    devices.filter(d => d.ieee === req.params.deviceId).map(d => {

      if (req.params.command === 'on') {
        coordinator.driver.send('action_onoff', {
          address: d.address,
          endpoint: d.endpoints[0].id,
          on: true
        });

      } else if (req.params.command === 'off') {
        coordinator.driver.send('action_onoff', {
          address: d.address,
          endpoint: d.endpoints[0].id,
          on: false
        });

      }
    });

    res.render("overview", {
      "data": {
        "devices": devices,
        "alert": {
          "message": "Commande '" + req.params.command + "' envoyée!",
          "type": "info"
        },
        "relative": "../../../"
      }
    });
  } else {
    res.json("access is denied");
  }
});

//
// Methods
//
let tokenExists = (req) => {
  let user_token = req.cookies['zigate_app_token']; // always empty
  if (user_token) {
    return true;
  } else {
    return false;
  }
}