# Zephykus

Zephykus is a tool to visualize ingress rules and flow of network traffic in Kubernetes.

![README_demo.png](README_demo.png)

Entrypoint is the *Kubernetes Ingress* node. Two ingress rules are defined (`zephykus` and `nginx`) that redirect traffic to the corresponding service. Based on the kubernetes label selectors, two pods each do match the service description and will receive the traffic.

Hovering over each entity reveals additional information like ingress annotations, port configuration and service types.

## Future Improvements

- [ ] Better UI
- [ ] Add path url/path input textbox and highlight destination/target pods
- [ ] Show whether a SSL certificate is attached to an ingress rule
- [ ] Add pod/service/ingress filter
