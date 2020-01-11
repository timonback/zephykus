import cytoscape from "cytoscape";

export var cy = cytoscape({
  container: document.getElementById('ingress-network'),
  style: [
    {
      "selector": "node[label]",
      "style": {
        "label": "data(label)"
      }
    },
    {
      "selector": "node[entrypoint != '']",
      "style": {
        "background-color": "red"
      }
    },

    {
      "selector": "edge[label]",
      "style": {
        "label": "data(label)",
        "width": 3
      }
    },
    {
      "selector": ".bottom-center",
      "style": {
        "text-valign": "bottom",
        "text-halign": "center"
      }
    },

    {
      "selector": "edge",
      "style": {
        "curve-style": "straight",
        "width": 1,
        "target-arrow-shape": "triangle"
      }
    },

    {
      "selector": ":selected",
      "style": {
        "background-color": "orange"
      }
    },

    {
      "selector": ".highlight-parent",
      "style": {
        "background-color": "green"
      }
    },
    {
      "selector": ".highlight-child",
      "style": {
        "background-color": "lightgreen"
      }
    },
    {
      "selector": ".search-highlight",
      "style": {
        "border-width": 3
      }
    },
  ]
});
cy.on('click', 'node', function (event: cytoscape.EventObject) {
  var node = event.target;
  document.getElementById("code").innerText = node.data().title;
  highlightConnectedNodes(node);
});
cy.on('click', 'edge', function (event: cytoscape.EventObject) {
  var edge = event.target;
  document.getElementById("code").innerText = edge.data().title;
  highlightConnectedNodes(edge.target());
});
function highlightConnectedNodes(node: cytoscape.NodeCollection) {
  cy.elements().removeClass("highlight-parent").removeClass("highlight-child");

  node.ancestors().addClass("highlight-parent");
  node.descendants().addClass("highlight-child");
  node.predecessors().addClass("highlight-parent");
  node.successors().addClass("highlight-child");
}


declare let window: any;
window.cy = cy;
