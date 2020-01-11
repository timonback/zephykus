import axios from "axios";
import { cy } from './cytograph';
import { renderNetwork } from './graph';

import './app.css';

let renderOptions = {
  data: {},
  full: false,
  search: "",
};
function render(renderOpts: any) {
  if (renderOpts.full) {
    renderOpts.full = false;
    const dataset = renderNetwork(renderOpts.data, renderOpts);

    cy.remove(cy.elements());
    cy.add(dataset.nodes.map(function (el) {
      return { selector: 'edge', data: el, classes: 'bottom-center' }
    }
    ));
    cy.add(dataset.edges.map(function (el) {
      return { selector: 'node', data: { ...el }, classes: 'bottom-center' }
    }
    ));
    cy.layout({
      fit: true,
      name: "cose"
    }).run();
  }

  if (renderOpts.search) {
    cy.elements().removeClass("search-highlight");
    const resultNodes = cy.elements("[title *= '" + renderOpts.search.replace("'", "\'") + "']").addClass("search-highlight");

    const list = document.getElementById("recommendations");
    while (list.hasChildNodes()) {
      list.removeChild(list.lastChild);
    }
    for (var i = 0; i < resultNodes.length; i++) {
      const name = resultNodes[i].data().label;
      const li = document.createElement('li');
      li.appendChild(document.createTextNode(name));
      li.onclick = function () {
        cy.elements("[label = '" + name + "']").emit("click").select();
      }

      list.appendChild(li);
    }
  }

  renderOptions = renderOpts;
}

function reload() {
  axios.get('/api/ingress')
    .then(function (response: any) {
      console.log(response.data)
      render({
        ...renderOptions,
        data: response.data,
        full: true
      });
    })
    .catch(function (error) {
      console.log(error);
    });
}
reload();

declare let window: any;
window.reload = reload;
window.render = render;
