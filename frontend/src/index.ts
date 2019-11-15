
import vis from "vis-network"
import axios from "axios"
import { findCommon } from './utils'
import './index.css';

var nodes = new vis.DataSet([]);
var edges = new vis.DataSet([]);
var data = {
  nodes: nodes,
  edges: edges
};

var options = {
  interaction: { hover: true },
  layout: {
    //hierarchical: {
    //  shakeTowards: "leaves",
    //  sortMethod: "directed"
    //}
  },
  edges: {
    arrows: "to"
  }
};

const htmlContainer = document.getElementById("ingress-network");
const network = new vis.Network(htmlContainer, data, options);



axios.get('/api/ingress')
  .then(function (response: any) {
    console.log(response.data)
    nodes.clear();
    edges.clear();

    var serviceMap = new Map();
    nodes.add({ id: 0, label: "Kubernetes Ingress", title: "Kubernetes Ingress Entrypoint"})

    const ingressClasses: Map<string, number> = new Map();
    const pods: Map<string, number> = new Map();
    // map of LabelKey -> LabelValue -> Pod
    const podLabels: Map<string, Map<string, string[]>> = new Map();
    for (const podKey in response.data["pods"]) {
      const pod = response.data["pods"][podKey]
      const namespace: string = pod["metadata"]["namespace"]
      const podName: string = pod["metadata"]["name"]

      let containerPortMappings: string[] = []
      const containers = pod["spec"]["containers"]
      for (const containerKey in containers) {
        const container = containers[containerKey]

        const containerOpenPorts: string[] = [];
        const containerPorts = containers[containerKey]["ports"]
        for (const portMappingKey in containerPorts) {
          const portMapping = containerPorts[portMappingKey]
          containerOpenPorts.push(portMapping["containerPort"])
        }
        containerPortMappings.push(containerOpenPorts.join(","))

        // check for ingress-class
        for (const containerArgsKey in container["args"]) {
          const containerArg: string = container["args"][containerArgsKey]
          const match = containerArg.match(/-ingress-class=([a-zA-Z-]+)/)
          if (match !== null) {
            // This ingress rule is handled by another ingress
            ingressClasses.set(match[1], nodes.length)
          }
        }
      }

      for (const podLabelKey in pod["metadata"]["labels"]) {
        const podLabelWithNamespace = podLabelKey + "." + namespace
        if (!podLabels.has(podLabelWithNamespace)) {
          podLabels.set(podLabelWithNamespace, new Map());
        }
        const labelKey = podLabels.get(podLabelWithNamespace)

        const podLabelValue: string = pod["metadata"]["labels"][podLabelKey]
        if (!labelKey.has(podLabelValue)) {
          labelKey.set(podLabelValue, []);
        }
        labelKey.get(podLabelValue).push(podName)
      }

      pods.set(podName + "." + namespace, nodes.length)
      nodes.add({ id: nodes.length, label: podName + "." + namespace, title: "Open ports: " + containerPortMappings.join(", ") })
    }

    const services = response.data["services"];
    for (const service in services) {
      const serviceName: string = services[service]["metadata"]["name"]
      const namespace: string = services[service]["metadata"]["namespace"]
      const ports = services[service]["spec"]["ports"]

      const selectedPods: string[][] = []
      const serviceSelector: { [key: string]: string } = services[service]["spec"]["selector"] ? services[service]["spec"]["selector"] : [];
      for (const selectorKey in serviceSelector) {
        const selectorValue: string = serviceSelector[selectorKey]
        selectedPods.push(podLabels.get(selectorKey + "." + namespace).get(selectorValue))
      }
      const selectedPodsAllMatched = findCommon(selectedPods)
      for (const podNameKey in selectedPodsAllMatched) {
        const selectorPodName = selectedPodsAllMatched[podNameKey] + "." + namespace
        const podNodeId = pods.get(selectorPodName);
        edges.add({ from: nodes.length, to: podNodeId });
      }


      let portMappings: string[] = []
      for (const portMappingKey in ports) {
        const portMapping = ports[portMappingKey]
        portMappings.push(portMapping["port"] + ":" + portMapping["targetPort"])
      }

      serviceMap.set(serviceName + "." + namespace, nodes.length)
      nodes.add({ id: nodes.length, label: serviceName + "." + namespace, title: "Port mappings: " + portMappings.join(", ")})
    }

    const ingresses = response.data["ingresses"];
    for (var ingress in ingresses) {
      const namespace: string = ingresses[ingress]["metadata"]["namespace"]

      let fromNode = 0
      const annotations = ingresses[ingress]["metadata"]["annotations"]
      for (const annotationKey in annotations) {
        if (annotationKey === "kubernetes.io/ingress.class") {
          // This ingress rule is handled by another ingress
          const ingressClass: string = annotations[annotationKey]
          fromNode = ingressClasses.get(ingressClass)
        }
      }

      for (var ruleKey in ingresses[ingress]["spec"]["rules"]) {
        const rule = ingresses[ingress]["spec"]["rules"][ruleKey]
        for (var pathKey in rule["http"]["paths"]) {
          const host: string = rule["host"] ? rule["host"] : ""
          const path: string = rule["http"]["paths"][pathKey]
          const serviceName: string = path["backend"]["serviceName"]

          var serviceNodeId = serviceMap.get(serviceName + "." + namespace)
          edges.add({ from: fromNode, to: serviceNodeId, label: host + path["path"] });
        }
      }
    }
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  });
