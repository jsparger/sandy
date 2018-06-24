class CCDB {
  constructor(url) {
    this._url = url;
    this._slots_url = this._url + "/rest/slots/";
    this._slot_names_url = this._url + "/rest/slotNames";
    this._count = 0;
    this._nodes = {};
  }

  query(url) {
    return d3.json(url, {headers: {"origin": "localhost"}});
  }

  async get_slot(name) {
    this._nodes[name] = this._nodes[name] || this.query(encodeURI(this._slots_url + name));
    return this._nodes[name];
  }

  async get_children(name) {
    let n = await ccdb.get_slot(name);
    let relationships = ['children','controls','powers'];
    let promises = [];
    for (let r of relationships) {
      let targets = n[r];
      if (!targets) continue;
      for (let name of targets) {
        promises.push(ccdb.get_slot(name));
      }
    }
    return promises;
  }

  async get_slot_names() {
    if (!this._slot_names) {
      let json = await this.query(this._slot_names_url);
      this._slot_names = [];
      for (let slot of json.names) {
        this._slot_names.push(slot.name);
      }
    }
    return this._slot_names;
  }
};

function ccdb_fetch_related_nodes_on_toggle(graph,vis,ccdb) {
  async function f(d) {
    if (d.type !== "CCDB") return;
    let children = await Promise.all(await ccdb.get_children(d.name));
    let action = (d.expanded ? graph.remove : graph.add).bind(graph);;
    for (let t of children) {
      if ((t.expanded !== undefined) && (t.expanded === d.expanded)) f(t);
      t.id = t.name;
      t.type = "CCDB";
      let arg = d.expanded ? t : {id: `${d.id}.${t.id}`, source: d, target: t};
      action(arg);
      vis.update();
      // vis._nodes.selectAll("circle")
      //   .style("fill", ccdb_node_color);
    }
    d.expanded = d.expanded ? false: true;
  }
  return f;
}

// function ccdb_node_color(d) {
//   if (d.expanded === undefined) {
//     return "#c6dbef"; // collapsed package
//   }
//   else {
//     return "white"; // leaf node
//   }
// }
//
// function ccdb_link_color(d) {
//   let colors = {
//     children: "#9ecae1",
//     powers: "red",
//     controls: "darkorange",
//   };
//
//   return colors[d.link_type];
// }

function update_nav(editor,ccdb) {
  return async (d) => {
    let safe = Object.assign({}, d)
    delete safe.links;
    editor.set(safe);
    editor.setMode("form");
    editor.expandAll();
    openNav();
  }
}

function openNav() {
    document.getElementById("sidenav").style.width = "400px";
    document.getElementById("force").style.marginRight = "400px";
}

// configure jsoneditor
let container = document.getElementById("jsoneditor");
let options = {};
editor = new JSONEditor(container, options);

// configure force
let w = 1000; let h = 500;
let graph = new gravis.Graph();
let vis = new gravis.Vis(graph, w, h);
vis._sim.force("center", null)
        .force("charge", d3.forceManyBody().strength(-100).distanceMax(300))
let int = new gravis.Interact(vis);
let act = new gravis.Actions(int);
act.highlight_selected_entity();
act.highlight_hover_entity();
act.create_node_on_shift_click();
act.delete_selected_node();

let tmp_proxy_url = "http://172.18.0.4:8080"
let proxy_url = "http://proxy.sandy.esss.lu.se";
let ccdb_url = "https://ccdb.esss.lu.se"
let url = `${tmp_proxy_url}/${ccdb_url}`
let cheat = "https://cors-anywhere.herokuapp.com/https://ccdb.esss.lu.se/"
let ccdb = new CCDB(url);

let root = {id: 0, name: "_ROOT", type: "CCDB", fx: w/2, fy: h/2};
graph.add(root);
vis.update();

int.dispatch.on("toggle.ccdb", ccdb_fetch_related_nodes_on_toggle(graph, vis, ccdb));
int.dispatch.on("select.nav", update_nav(editor, ccdb));
