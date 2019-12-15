
import axios from "axios";
import { findCommon } from './utils';
import './index.css';
import cytoscape from "cytoscape";


interface DataSet {
  nodes: cytoscape.NodeDataDefinition[];
  edges: cytoscape.EdgeDataDefinition[];
}

var cy = cytoscape({
  container: document.getElementById('ingress-network'),
  style: [
    {
      "selector": "node[label]",
      "style": {
        "label": "data(label)"
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
        "target-arrow-shape": "triangle"
      }
    },

    {
      "selector": ".selected",
      "style": {
        "background-color": "orange"
      }
    },
    {
      "selector": ".highlight",
      "style": {
        "background-color": "blue"
      }
    },
  ]
});
cy.on('click', 'node', function(event: cytoscape.EventObject) {
  var node = event.target;
  document.getElementById("info").innerHTML = node.data().title;
  highlightConnectedNodes(node);
});
cy.on('click', 'edge', function(event: cytoscape.EventObject) {
  var edge = event.target;
  document.getElementById("info").innerHTML = edge.data().title;
  highlightConnectedNodes(edge.connectedNodes());
});
function highlightConnectedNodes(node: cytoscape.NodeCollection) {
  cy.nodes().removeClass("highlight").removeClass("selected");
  cy.edges().removeClass("highlight").removeClass("selected");
  node.addClass("selected");
  node.ancestors().addClass("highlight");
  node.descendants().addClass("highlight");
  node.predecessors().addClass("highlight");
  node.successors().addClass("highlight");
}
declare let window: any;
window.cy = cy;

// load data
axios.get('/api/ingress')
  .then(function (response: any) {
    console.log(response.data)
    renderNetwork(response.data)
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  });

function renderNetwork(data: any) {
  const dataset = {
    nodes: [] as cytoscape.NodeDataDefinition[],
    edges: [] as cytoscape.EdgeDataDefinition[]
  }
  dataset.nodes.push({ id: "0", label: "Kubernetes Ingress", title: "Kubernetes Ingress Entrypoint" })
  dataset.nodes.push({ id: "1", label: "Error Ingress" })

  //map of ServiceName to NodeId
  const serviceMap: Map<string, number> = new Map();
  // map for custom ingress controllers (ingress-class param)
  const ingressClasses: Map<string, number> = new Map();
  //map of PodName to NodeId
  const pods: Map<string, number> = new Map();
  // map of LabelKey -> LabelValue -> PodName
  const podLabels: Map<string, Map<string, string[]>> = new Map();

  processPods(data, dataset, ingressClasses, podLabels, pods);
  processServices(data, dataset, podLabels, pods, serviceMap);
  processIngresses(data, dataset, ingressClasses, serviceMap);

  cy.remove(cy.elements());
  cy.add(dataset.nodes.map(function (el) {
    return { selector: 'edge', data: el, classes: 'bottom-center' }
  }
  ));
  cy.add(dataset.edges.map(function (el) {
    return { selector: 'node', data: { ...el}, classes: 'bottom-center' }
  }
  ));
  cy.layout({
    fit: true,
    name: "cose"
  }).run();
}


function processIngresses(data: any, dataset: DataSet, ingressClasses: Map<string, number>, serviceMap: Map<string, number>) {
  const ingresses = data["ingresses"] ? data["ingresses"] : data["ingressesExtension"];
  for (var ingress in ingresses) {
    const namespace: string = ingresses[ingress]["metadata"]["namespace"];
    let fromNode = 0;
    const annotations = ingresses[ingress]["metadata"]["annotations"];
    const edgeLabelAnnotations = [];
    for (const annotationKey in annotations) {
      edgeLabelAnnotations.push(annotationKey + ": " + annotations[annotationKey]);
      if (annotationKey === "kubernetes.io/ingress.class") {
        // This ingress rule is handled by another ingress
        const ingressClass: string = annotations[annotationKey];
        fromNode = ingressClasses.get(ingressClass);
      }
    }
    // connect ingress rules to services
    for (var ruleKey in ingresses[ingress]["spec"]["rules"]) {
      const rule = ingresses[ingress]["spec"]["rules"][ruleKey];
      for (var pathKey in rule["http"]["paths"]) {
        const host: string = rule["host"] ? rule["host"] : "";
        const path: string = rule["http"]["paths"][pathKey];
        const serviceName: string = path["backend"]["serviceName"];
        var serviceNodeId = serviceMap.get(namespace + "." + serviceName);
        if (serviceNodeId) {
          dataset.edges.push({ id: "" + fromNode + "-" + serviceNodeId, source: "" + fromNode, target: "" + serviceNodeId, label: host + path["path"], title: edgeLabelAnnotations.join("<br/>") });
        } else {
          dataset.edges.push({ id: "" + fromNode + "-1", source: "" + fromNode, target: "" + "1", label: host + path["path"], title: edgeLabelAnnotations.join("<br/>") });
        }
      }
    }
  }
}

function processServices(data: any, dataset: DataSet, podLabels: Map<string, Map<string, string[]>>, pods: Map<string, number>, serviceMap: Map<string, number>) {
  const services = data["services"];
  for (const service in services) {
    const serviceName: string = services[service]["metadata"]["name"];
    const namespace: string = services[service]["metadata"]["namespace"];
    const ports = services[service]["spec"]["ports"];
    // connect service to pods
    let foundAllPodSelectors = true;
    const selectedPods: string[][] = [];
    const serviceSelector: {
      [key: string]: string;
    } = services[service]["spec"]["selector"] ? services[service]["spec"]["selector"] : [];
    for (const selectorKey in serviceSelector) {
      const selectorValue: string = serviceSelector[selectorKey];
      const selectorNamespaceKey: string = namespace + "." + selectorKey;
      const selector = podLabels.get(selectorNamespaceKey);
      if (selector) {
        const podSelector = selector.get(selectorValue);
        if (podSelector) {
          selectedPods.push(podSelector);
        } else {
          foundAllPodSelectors = false;
        }
      } else {
        foundAllPodSelectors = false;
      }
    }
    if (foundAllPodSelectors) {
      const selectedPodsAllMatched = findCommon(selectedPods);
      for (const podNameKey in selectedPodsAllMatched) {
        const selectorPodName = namespace + "." + selectedPodsAllMatched[podNameKey];
        const podNodeId = pods.get(selectorPodName);
        dataset.edges.push({ id: "" + dataset.nodes.length + "-" + podNodeId, source: "" + dataset.nodes.length, target: "" + podNodeId });
      }
    }
    let title = "Type: " + services[service]["spec"]["type"];
    if (services[service]["spec"]["type"] == "ExternalName") {
      title += "<br/>DNS: " + services[service]["spec"]["externalName"];
    }
    else {
      const portMappings: string[] = [];
      for (const portMappingKey in ports) {
        const portMapping = ports[portMappingKey];
        portMappings.push(portMapping["port"] + ":" + portMapping["targetPort"]);
      }
      const portMappingTitle = "Port mappings: " + portMappings.join(", ");
      title += "<br/>" + portMappingTitle;
    }
    serviceMap.set(namespace + "." + serviceName, dataset.nodes.length);
    dataset.nodes.push({ id: "" + dataset.nodes.length, label: namespace + "." + serviceName, title: title });
  }
}

function processPods(data: any, dataset: DataSet, ingressClasses: Map<string, number>, podLabels: Map<string, Map<string, string[]>>, pods: Map<string, number>) {
  for (const podKey in data["pods"]) {
    const pod = data["pods"][podKey];
    const namespace: string = pod["metadata"]["namespace"];
    const podName: string = pod["metadata"]["name"];
    let containerPortMappings: string[] = [];
    const containers = pod["spec"]["containers"];
    for (const containerKey in containers) {
      const container = containers[containerKey];
      const containerOpenPorts: string[] = [];
      const containerPorts = containers[containerKey]["ports"];
      for (const portMappingKey in containerPorts) {
        const portMapping = containerPorts[portMappingKey];
        containerOpenPorts.push(portMapping["containerPort"]);
      }
      containerPortMappings.push(containerOpenPorts.join(","));
      // check for ingress-class
      for (const containerArgsKey in container["args"]) {
        const containerArg: string = container["args"][containerArgsKey];
        const match = containerArg.match(/-ingress-class=([a-zA-Z-]+)/);
        if (match !== null) {
          // This ingress rule is handled by another ingress container
          ingressClasses.set(match[1], dataset.nodes.length);
        }
      }
    }
    for (const podLabelKey in pod["metadata"]["labels"]) {
      const podLabelWithNamespace = namespace + "." + podLabelKey;
      if (!podLabels.has(podLabelWithNamespace)) {
        podLabels.set(podLabelWithNamespace, new Map());
      }
      const labelKey = podLabels.get(podLabelWithNamespace);
      const podLabelValue: string = pod["metadata"]["labels"][podLabelKey];
      if (!labelKey.has(podLabelValue)) {
        labelKey.set(podLabelValue, []);
      }
      labelKey.get(podLabelValue).push(podName);
    }
    pods.set(namespace + "." + podName, dataset.nodes.length);
    dataset.nodes.push({ id: "" + dataset.nodes.length, label: namespace + "." + podName, title: "Ports: " + containerPortMappings.join(", ") });
  }
}
