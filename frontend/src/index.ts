import vis from "vis-network"
import axios from "axios"
import './index.css';

// create an array with nodes
var nodes = new vis.DataSet([
  { id: 1, label: "Node 1", title: "I have a popup!" },
  { id: 2, label: "Node 2", title: "I have a popup!" },
  { id: 3, label: "Node 3", title: "I have a popup!" },
  { id: 4, label: "Node 4", title: "I have a popup!" },
  { id: 5, label: "Node 5", title: "I have a popup!" }
]);

// create an array with edges
var edges = new vis.DataSet([
  { from: 1, to: 3 },
  { from: 1, to: 2 },
  { from: 2, to: 4 },
  { from: 2, to: 5 }
]);

// create a network
var data = {
  nodes: nodes,
  edges: edges
};

var options = {
  interaction: { hover: true },
  layout: {
    hierarchical: {
      direction: "UD",
      sortMethod: "directed"
    }
  },
  edges: {
    arrows: "to"
  }
};

var container = document.getElementById("ingress-network");
var network = new vis.Network(container, data, options);

network.on("click", function (params) {
  params.event = "[original event]";
  document.getElementById("eventSpan").innerHTML =
    "<h2>Click event:</h2>" + JSON.stringify(params, null, 4);
  console.log(
    "click event, getNodeAt returns: " + this.getNodeAt(params.pointer.DOM)
  );
});
network.on("doubleClick", function (params) {
  params.event = "[original event]";
  document.getElementById("eventSpan").innerHTML =
    "<h2>doubleClick event:</h2>" + JSON.stringify(params, null, 4);
});
network.on("oncontext", function (params) {
  params.event = "[original event]";
  document.getElementById("eventSpan").innerHTML =
    "<h2>oncontext (right click) event:</h2>" + JSON.stringify(params, null, 4);
});
network.on("dragStart", function (params) {
  // There's no point in displaying this event on screen, it gets immediately overwritten
  params.event = "[original event]";
  console.log("dragStart Event:", params);
  console.log(
    "dragStart event, getNodeAt returns: " + this.getNodeAt(params.pointer.DOM)
  );
});
network.on("dragging", function (params) {
  params.event = "[original event]";
  document.getElementById("eventSpan").innerHTML =
    "<h2>dragging event:</h2>" + JSON.stringify(params, null, 4);
});
network.on("dragEnd", function (params) {
  params.event = "[original event]";
  document.getElementById("eventSpan").innerHTML =
    "<h2>dragEnd event:</h2>" + JSON.stringify(params, null, 4);
  console.log("dragEnd Event:", params);
  console.log(
    "dragEnd event, getNodeAt returns: " + this.getNodeAt(params.pointer.DOM)
  );
});
network.on("zoom", function (params) {
  document.getElementById("eventSpan").innerHTML =
    "<h2>zoom event:</h2>" + JSON.stringify(params, null, 4);
});
network.on("showPopup", function (params) {
  document.getElementById("eventSpan").innerHTML =
    "<h2>showPopup event: </h2>" + JSON.stringify(params, null, 4);
});
network.on("hidePopup", function () {
  console.log("hidePopup Event");
});
network.on("select", function (params) {
  console.log("select Event:", params);
});
network.on("selectNode", function (params) {
  console.log("selectNode Event:", params);
});
network.on("selectEdge", function (params) {
  console.log("selectEdge Event:", params);
});
network.on("deselectNode", function (params) {
  console.log("deselectNode Event:", params);
});
network.on("deselectEdge", function (params) {
  console.log("deselectEdge Event:", params);
});
network.on("hoverNode", function (params) {
  console.log("hoverNode Event:", params);
});
network.on("hoverEdge", function (params) {
  console.log("hoverEdge Event:", params);
});
network.on("blurNode", function (params) {
  console.log("blurNode Event:", params);
});
network.on("blurEdge", function (params) {
  console.log("blurEdge Event:", params);
});

axios.get('/api/ingress')
  .then(function (response: any) {
    console.log(response.data)
    nodes.clear();
    edges.clear();

    var services = new Map();
    services.set("root", 1);
    nodes.add({id: 1, label: "root"})

    for (var ingress in response.data) {
      var namespace = response.data[ingress]["metadata"]["namespace"]
      for(var rule in response.data[ingress]["spec"]["rules"]) {
        for(var path in response.data[ingress]["spec"]["rules"][rule]["http"]["paths"]) {
          const serviceName = response.data[ingress]["spec"]["rules"][rule]["http"]["paths"][path]["backend"]["serviceName"]
          const servicePort = response.data[ingress]["spec"]["rules"][rule]["http"]["paths"][path]["backend"]["servicePort"]
          if(!services.has(serviceName)) {
            services.set(serviceName, services.size + 1)
            nodes.add({id: services.size, label: serviceName, title: serviceName+"."+namespace})
          }
          var serviceNodeId = services.get(serviceName)
          edges.add({from: 1, to: serviceNodeId, label: response.data[ingress]["spec"]["rules"][rule]["http"]["paths"][path]["path"]});
        }
      }
    }
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  });
