
import cytoscape from "cytoscape";

import { findCommon } from './utils';


interface DataSet {
  nodes: cytoscape.NodeDataDefinition[];
  edges: cytoscape.EdgeDataDefinition[];
}

export function renderNetwork(data: any, renderOptions: any): DataSet {
  const dataset = {
    nodes: [] as cytoscape.NodeDataDefinition[],
    edges: [] as cytoscape.EdgeDataDefinition[]
  }
  dataset.nodes.push({ id: "0", label: "Kubernetes CNI Ingress", title: "Kubernetes Ingress Entrypoint", entrypoint: "root" })
  dataset.nodes.push({ id: "1", label: "Error Ingress", title: "Holds ill configured ingress rules", entrypoint: "notConnected" })

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

  return dataset;
}


function processIngresses(data: any, dataset: DataSet, ingressClasses: Map<string, number>, serviceMap: Map<string, number>) {
  const ingresses = data["ingresses"] ? data["ingresses"] : data["ingressesExtension"];
  for (var ingressKey in ingresses) {
    const ingress = ingresses[ingressKey]
    const namespace: string = ingress["metadata"]["namespace"];
    let fromNode = 0;
    const annotations = ingress["metadata"]["annotations"];
    for (const annotationKey in annotations) {
      if (annotationKey === "kubernetes.io/ingress.class") {
        // This ingress rule is handled by another ingress
        const ingressClass: string = annotations[annotationKey];
        fromNode = ingressClasses.get(ingressClass);
      }
    }
    // connect ingress rules to services
    for (var ruleKey in ingress["spec"]["rules"]) {
      const rule = ingress["spec"]["rules"][ruleKey];
      for (var pathKey in rule["http"]["paths"]) {
        const host: string = rule["host"] ? rule["host"] : "";
        const path: string = rule["http"]["paths"][pathKey];
        const serviceName: string = path["backend"]["serviceName"];
        var serviceNodeId = serviceMap.get(namespace + "." + serviceName);
        if (serviceNodeId) {
          dataset.edges.push({
            id: "" + fromNode + "-" + serviceNodeId,
            source: "" + fromNode,
            target: "" + serviceNodeId,
            label: host + path["path"],
            title: JSON.stringify(ingress, null, '  ')
          });
        } else {
          dataset.edges.push({
            id: "" + fromNode + "-1",
            source: "" + fromNode,
            target: "" + "1",
            label: host + path["path"],
            title: JSON.stringify(ingress, null, '  ')
          });
        }
      }
    }
  }
}

function processServices(data: any, dataset: DataSet, podLabels: Map<string, Map<string, string[]>>, pods: Map<string, number>, serviceMap: Map<string, number>) {
  const services = data["services"];
  for (const serviceKey in services) {
    const service = services[serviceKey];
    const serviceName: string = service["metadata"]["name"];
    const namespace: string = service["metadata"]["namespace"];
    const ports = service["spec"]["ports"];
    // connect service to pods
    let foundAllPodSelectors = true;
    const selectedPods: string[][] = [];
    const serviceSelector: {
      [key: string]: string;
    } = service["spec"]["selector"] ? service["spec"]["selector"] : [];
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
        dataset.edges.push(
          {
            id: "" + dataset.nodes.length + "-" + podNodeId,
            source: "" + dataset.nodes.length,
            target: "" + podNodeId,
            label: "",
          });
      }
    }
    serviceMap.set(namespace + "." + serviceName, dataset.nodes.length);

    let node = {
      id: "" + dataset.nodes.length,
      label: namespace + "." + serviceName,
      title: JSON.stringify(service, null, '  '),
      entrypoint: ""
    }
    if (service["spec"]["type"] == "NodePort" || service["spec"]["type"] == "LoadBalancer") {
      node.entrypoint = service["spec"]["type"];
    }
    dataset.nodes.push(node);
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
    let node = {
      id: "" + dataset.nodes.length,
      label: namespace + "." + podName,
      title: JSON.stringify(pod, null, '  '),
      entrypoint: ""
    };
    dataset.nodes.push(node);
  }
}
