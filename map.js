// ── map init ───────────────────────────────────────────────────────────────
var map = L.map("map",{attributionControl: false, zoomSnap: 0.1}).setView([0, 0], 10, );

var myAttrControl = L.control.attribution().addTo(map);
myAttrControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');

// dark_nolabels, light_all, light_nolabels
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CartoDB",
    subdomains: "abcd",
    maxZoom: 19
}).addTo(map);

// ── state ──────────────────────────────────────────────────────────────────
let CLUSTERS  = [];
let RANGES    = {};
let COL_NAMES = [];
let CLUSTER_ALIAS = {};
let EDGES_DATA = {};
let HULLS     = {};

let clusterType = "points";
let networkActive = "NSG";
let colorVar = "select";
let colormap = "Viridis";
let colormapMinVal = "range";
let colormapMaxVal = "range";
let excludeOORmin = false;
let excludeOORmax = false;
let logColor = false;
let sqrtColor = false;
let sizeVar = "select";

const clusterLayer = L.layerGroup().addTo(map);
const networkLayer = L.layerGroup().addTo(map);


// ── variable selector ──────────────────────────────────────────────────────
const CLUSTER_SELECTION = {
    "points": "Puntos",
    "hulls" : "Cápsulas Convexas",
    "hullsWithStops" : "Cápsulas Convexas y Paradas",
};

const NETWORK_SELECTION = {
    "NSG": "Red de Conectividad Directa",
    "NSG_trips": "Red de Conectividad Directa - Servicios",
    "CG" : "Red de Conectividad Completa (Puede ser muy lenta)"
};

const COLORMAP_SELECTION = ["viridis", "Blues", "Greys", "Reds", "Spectral",
    "custom1", "custom2", "custom3", "custom3r", "custom4", "custom4r", "custom5", "custom6", "custom7",
    "custom8", "custom9", "custom10", "custom11", "custom12", "custom13"]

const CUSTOM_COLORMAP = {
    "custom1": chroma.scale(["#f7f490", "ef9b7d"]).mode('lrgb'),
    "custom2": chroma.scale(["#f7f490", "ed571f"]).mode('lrgb'),
    "custom3": chroma.scale(["#bc97f8", "#93e5f1", "#caf679", "#f7f490", "#ef9b7d"] ).mode('lrgb'),
    "custom3r": chroma.scale(["#ef9b7d", "#f7f490", "#caf679", "#93e5f1", "#bc97f8"] ).mode('lrgb'),
    "custom4": chroma.scale(["#8342e2", "#46bcdc", "#9ed23c", "#facb0e", "#ed571f"] ).mode('lrgb'),
    "custom4r": chroma.scale(["#ed571f", "#facb0e", "#9ed23c","#46bcdc" , "#8342e2"] ).mode('lrgb'),
    "custom5": chroma.scale(["caf679", "#f7f490", "#ef9b7d"] ).mode('lrgb'),
    "custom6": chroma.scale(["#bc97f8", "#93e5f1", "#caf679"] ).mode('lrgb'),
    "custom7": chroma.scale(["#9ed23c", "#facb0e", "#ed571f"] ).mode('lrgb'),
    "custom8": chroma.scale(["#485a60", "#8342e2", "#9ed23c", "#facb0e"] ).mode('lrgb'),
    "custom8r": chroma.scale(["#facb0e", "#9ed23c", "#8342e2", "#485a60"] ).mode('lrgb'),
    "custom9": chroma.scale(["#8342e2", "#f7f490"] ).mode('lch'),
    "custom9r": chroma.scale(["#f7f490", "#8342e2"] ).mode('lch'),
    "custom10": chroma.scale(["#46bcdc", "#9ed23c", "#facb0e"] ).mode('lrgb'), 
    "custom11": chroma.scale(["#485a60", "#ed571f", "#f7f490"] ).mode('lch'), 
    "custom12": chroma.scale(["#485a60", "#ed571f", "#f7f490"] ).mode('lrgb'), 
    "custom13": chroma.scale(["#8342e2", "#46bcdc", "#9ed23c"]).mode('hsl')
};

let VARIABLE_SELECTIONS;
let LABEL_MAP;

// ── color helper ───────────────────────────────────────────────────────────
function getColor(col, value) {
    if ((excludeOORmax & (value>colormapMaxVal)) | (excludeOORmin & (value<colormapMinVal))) {
        return "#00000000";
    }
    let [mn, mx] = RANGES[col];
    if (colormapMinVal != "range") mn = colormapMinVal;
    if (colormapMaxVal != "range") mx = colormapMaxVal;
    if (logColor) {
        mn = Math.log(mn);
        mx = Math.log(mx);
        value = Math.log(value);
    } else if (sqrtColor) {
        mn = Math.pow(mn,0.5);
        mx = Math.pow(mx,0.5);
        value = Math.pow(value, 0.5);
    }
    const t = (mx === mn) ? 0.5 : (value - mn) / (mx - mn);
    if (colormap.includes("custom")) {
        return CUSTOM_COLORMAP[colormap](t).hex();
    }
    return chroma.scale(colormap)(t).hex();
}
    
function getSize(col, value) {
    const [mn, mx] = RANGES[col];
    const t = (mx === mn) ? 0.5 : (value - mn) / (mx - mn);
    return 1 + t * 9;
}

// ── tooltip builder ───────────────────────────────────────────────────────────
function buildTooltip(c) {
    let name = c.index;
    if (c.index in CLUSTER_ALIAS) name = `${c.index} - ${CLUSTER_ALIAS[c.index]}`;

    let res =  `<h2 style="margin: 4px 0;">Cluster ${name}</h2>
                <b>Lat:</b> ${c.cent_lat.toFixed(4)} &nbsp;<b>Lon:</b> ${c.cent_lon.toFixed(4)}<br/>`;
    for (const [CATEGORY, COLS] of Object.entries(VARIABLE_SELECTIONS)) {
        res += `<h3 style="margin: 4px 0 0 4px;">${CATEGORY}</h3>`;
        COLS.forEach(col => {
            if (!LABEL_MAP[col]) return;
            let val = c[col];
            if (val%10 == 0)  val.toFixed(0);
            else if (val < 1) val = val.toFixed(4);
            else if (val < 0.001) val = val.toFixed(6);
            res += `&nbsp <b>${col}:</b> ${val} &nbsp;`;
        });
    };
    
    return res;
}

// ── render clusters ────────────────────────────────────────────────────────
function renderClusters() {
    map.fire('click');
    clusterLayer.clearLayers();

    if (clusterType == "hulls" || clusterType == "hullsWithStops") {
        let i = 0;
        HULLS.forEach(function(cluster) {
            const hullLayer = L.layerGroup().addTo(clusterLayer);
            const color = colorVar=="select" ?  "lightslategray" : getColor(colorVar, CLUSTERS[i][colorVar]);
            const hull = L.polygon(cluster["hull"], {
                color: color,
                fillColor: color,
                fillOpacity:0.5,
                weight: 3,
                smoothFactor: 3 // antes 5
            });
            const popup = L.popup({className: "custom-tooltip",
                                    content:buildTooltip(CLUSTERS[i]),
                                    maxWidth:500});
            hull.bindPopup(popup);
            hullLayer.addLayer(hull)

            if (clusterType == "hullsWithStops") {
                cluster["points"].forEach(function(stop) {
                    const circle = L.circle(stop, {
                        fillColor: "black",
                        fillOpacity: 1,
                        radius: 8,
                        stroke: false
                    }).addTo(hullLayer)
                })
            }
            i ++;
        })
    } else if (clusterType == "points") {
        CLUSTERS.forEach(function(c) {
            const color  = colorVar=="select" ?  "lightslategray" : getColor(colorVar, c[colorVar]);
            const size   = sizeVar=="select" ? 5 : getSize(sizeVar, c[sizeVar]);
            const marker = L.circleMarker([c.cent_lat, c.cent_lon], {
                radius:      size,
                color:       color,
                weight:      .5,
                fillColor:   color,
                fillOpacity: 1
            });
            const popup = L.popup({className: "custom-tooltip",
                                    content:buildTooltip(c),
                                    maxWidth:500});            
            marker.bindPopup(popup);
            clusterLayer.addLayer(marker);
        });
    }
    updateColorBar();
}

// ── Edges ───────────────────────────────────────────────────────────────────
function renderEdges() {
    networkLayer.clearLayers();
    if (networkActive == "select") return;
    
    let edges = EDGES_DATA[networkActive];
    const max_d = Math.max.apply(Math,Object.keys(edges).map(Number));
    const min_d = Math.min.apply(Math,Object.keys(edges).map(Number));


    if (["NSG", "NSG_trips", "NSG_OFR", "NSG_NFR"].includes(networkActive)) {
        Object.entries(edges).forEach(([d, segments]) => {
            var alpha = 0.05+(Number(d)+min_d)/((max_d-min_d));
            var color = "#485a60"; //"rgb(13, 88, 122)"; "#8342e2"
            const popup = L.popup({className: "custom-tooltip" }).setContent(`<p>N° de Rutas: ${d}</p>`);
            L.polyline(segments, {
                color: color,
                weight:      5,
                opacity: alpha,
                smoothFactor: 5
            }).bindPopup(popup).addTo(networkLayer);
        })
    } else if (networkActive == "CG") {
        Object.entries(EDGES_DATA.CG).forEach(([d, segments]) => {
            var alpha = (Number(d))/25;
            L.polyline(segments, {
                color:  `rgb(${1-alpha},${1-alpha},${1-alpha})`,
                weight:      2,
                smoothFactor: 20
            }).addTo(networkLayer);
        });
    }
}


// ── legend ─────────────────────────────────────────────────────────────────
function updateColorBar() {
    const fontsize = "20px";
    let el = document.getElementById("cluster-legend");
    if (!el) {
        el = document.createElement("div");
        el.id = "cluster-legend";
        Object.assign(el.style, {
            position: "fixed", bottom: "30px", right: "50%", zIndex: "1000",
            background: "white", padding: "8px 14px",
            borderRadius: "6px", boxShadow: "0 0 8px rgba(0,0,0,0.25)",
            fontSize: fontsize, textAlign: "center", minWidth: "200px",
            pointerEvents: "none", //transform:"translateX(50%)"
        });
        document.body.appendChild(el);
    }

    let [mn, mx] = colorVar == "select" ? [0,0] : RANGES[colorVar];
    if (colormapMinVal != "range") mn = colormapMinVal;
    if (colormapMaxVal != "range") mx = colormapMaxVal;
    let mid  = (mn + mx) / 2;
    
    if (logColor) mid = Math.exp((Math.log(mx)+Math.log(mn))/2);
    else if (sqrtColor) mid = Math.pow((Math.sqrt(mx)+Math.sqrt(mn))/2,2);
    
    const dec  = (mx < 1) ? 4 : (mx < 100) ? 2 : 0;
    const fmt  = v => v.toFixed(dec);
    const steps  = 4;
    var colors;
    if (colormap.includes("custom")) {
        colors = CUSTOM_COLORMAP[colormap].colors(steps);
    } else {
        colors = chroma.scale(colormap).colors(steps);
    }
    var gradient = `linear-gradient(to right, ${colors.join(",")})`;
    el.innerHTML =
        `<strong>${colorVar ? LABEL_MAP[colorVar] : ""}</strong><br>
        <div style="background:${gradient}; width:350px; height:12px; border-radius:3px;"></div>
        <div style="width:350px;">
          <table width="350px" cellspacing="0" style="border-collapse:collapse;" cellpadding="0">
            <tbody>
              <tr>
                <td width="33%" align="left" style="font-size:5px; line-height:1; padding-top:0;">▌</td>
                <td width="34%" align="center" style="font-size:5px; line-height:01; padding-top:0;">▌</td>
                <td width="33%" align="right" style="font-size:5px; line-height:1; padding-top:0;">▌</td>
              </tr>
              <tr>
                <td width="33%" align="left" style="font-size:${fontsize};">${fmt(mn)}</td>
                <td width="34%" align="center style="font-size:${fontsize};">${fmt(mid)}</td>
                <td width="33%" align="right" style="font-size:${fontsize};">${fmt(mx)}</td>
              </tr>
            </tbody>
          </table>
        </div>`;
}



function makeNullOption(currentVar) {
    const opt   = document.createElement("option");
    opt.value   = "select";
    opt.text    = "Sin Seleccionar";
    opt.selected = (currentVar === "select");
    return opt;
}

function buildClusterSelector() {
    const cluster_label  = document.createElement("label");
    cluster_label.innerHTML = "<strong>Tipo de Clusters:</strong><br>";

    const cluster_select = document.createElement("select");
    cluster_select.style.marginTop = "4px";
    cluster_select.style.marginBottom = "10px"

    for (const [net, label] of Object.entries(CLUSTER_SELECTION)) {
        const opt   = document.createElement("option");
        opt.value   = net;
        opt.text    = label;
        opt.selected = (net === clusterType);
        cluster_select.appendChild(opt);
    }
    cluster_select.appendChild(makeNullOption(clusterType));

    cluster_select.addEventListener("change", e => {
        clusterType = e.target.value;
        renderClusters();
    });

    const div = document.createElement("div");
    div.appendChild(cluster_label);
    div.appendChild(cluster_select);

    return div;
}

function buildNetworkSelector() {
    const network_label  = document.createElement("label");
    network_label.innerHTML = "<strong>Tipo de Red:</strong><br>";

    const network_select = document.createElement("select");
    network_select.style.marginTop = "4px";
    network_select.style.marginBottom = "4px"

    for (const [net, label] of Object.entries(NETWORK_SELECTION)) {
        const opt   = document.createElement("option");
        opt.value   = net;
        opt.text    = label;
        opt.selected = (net === networkActive);
        network_select.appendChild(opt);
    }
    network_select.appendChild(makeNullOption(networkActive));

    network_select.addEventListener("change", e => {
        networkActive = e.target.value;
        renderEdges();
    });

    const div = document.createElement("div");
    div.appendChild(network_label);
    div.appendChild(network_select);

    return div;
}

function buildColorSelector() {
    const color_label  = document.createElement("label");
    color_label.innerHTML = "<strong>Colorear clusters por:</strong><br>";

    const color_select = document.createElement("select");
    color_select.style.marginTop = "4px";
    color_select.style.marginBottom = "4px"

    color_select.appendChild(makeNullOption(colorVar));
    for (const [CATEGORY, COLS] of Object.entries(VARIABLE_SELECTIONS)) {
        const group = document.createElement("optgroup");
        group.label = CATEGORY
        COLS.forEach(col => {
            //if (!LABEL_MAP[col]) return;
            const opt   = document.createElement("option");
            opt.value   = col;
            opt.text    = LABEL_MAP[col] || col;
            opt.selected = (col === colorVar);
            group.appendChild(opt);
        });
        color_select.appendChild(group);
    };

    color_select.addEventListener("change", e => {
        colorVar = e.target.value;
        renderClusters();
    });
    
    const div = document.createElement("div");
    div.appendChild(color_label);
    div.appendChild(color_select);

    return div;
}

function buildColorBarSelector() {
    const label = document.createElement("label");
    label.innerHTML = "<strong>Seleccionar Colormap:</strong><br>";

    const select = document.createElement("select");
    Object.assign(select.style, { marginTop: "4px", marginBottom: "4px", width: "150px" });

    COLORMAP_SELECTION.forEach(cm => {
        const opt = new Option(cm, cm, cm === colormap, cm === colormap);
        opt.selected = (cm === colormap);
        select.appendChild(opt);
    });

    $(select).on("change", e => { colormap = e.target.value; updateColorBar(); renderClusters();});

    const div = document.createElement("div");
    div.append(label, select);

    setTimeout(() => {
        $(select).select2({
            width: '80%',
            dropdownParent: $(div),
            templateResult: option => {
                if (!option.id) return option.text;
                var colors;
                if (option.id.includes("custom")) {
                    colors = CUSTOM_COLORMAP[option.id].colors(10);
                } else {
                    colors = chroma.scale(option.id).colors(10);
                }
                const gradient = `linear-gradient(to right, ${colors.join(",")})`;
                return $(`<div><strong>${option.id}</strong><div style="background:${gradient}; height:12px; border-radius:3px; margin-top:4px;"></div></div>`);
            },
            templateSelection: option => option.text  // ✅ plain text only, no preview
        });
    }, 0);

    
    const min_val_label  = document.createElement("label");
    min_val_label.innerHTML = "<strong>Min:</strong>";
    const min_val  = document.createElement("input");
    min_val.size = 3;

    const excludeOORmin_label  = document.createElement("label");
    excludeOORmin_label.innerHTML = "<strong>Excluir:</strong>";
    const excludeOORmin_checkbox  = document.createElement("input");
    excludeOORmin_checkbox.type = "checkbox";
    excludeOORmin_checkbox.addEventListener('change', function() {
        if (this.checked) {
            excludeOORmin = true;
        } else {
            excludeOORmin = false;
        }
    });

    const max_val_label  = document.createElement("label");
    max_val_label.innerHTML = "<strong>Max:</strong>";
    const max_val  = document.createElement("input");
    max_val.size = 3;

    const excludeOORmax_label  = document.createElement("label");
    excludeOORmax_label.innerHTML = "<strong>Excluir:</strong>";
    const excludeOORmax_checkbox  = document.createElement("input");
    excludeOORmax_checkbox.type = "checkbox";
    excludeOORmax_checkbox.addEventListener('change', function() {
        if (this.checked) {
            excludeOORmax = true;
        } else {
            excludeOORmax = false;
        }
    });
    

    const scale_label = document.createElement("label");
    scale_label.innerHTML = "<strong>Escala:</strong>";
    
    const scale_unif_val = document.createElement("input");
    const scale_log_val = document.createElement("input");
    const scale_sqrt_val = document.createElement("input");
    
    scale_unif_val.type = "radio";
    scale_log_val.type = "radio";
    scale_sqrt_val.type = "radio";
    
    scale_unif_val.name = "scale";
    scale_log_val.name = "scale";
    scale_sqrt_val.name = "scale";
    
    scale_unif_val.value = "unif";
    scale_log_val.value = "log";
    scale_sqrt_val.value = "sqrt";
    
    scale_unif_val.checked = true;
    
    function updateScaleVariables() {
        logColor = scale_log_val.checked;
        sqrtColor = scale_sqrt_val.checked;
    }
    
    scale_unif_val.addEventListener("change", updateScaleVariables);
    scale_log_val.addEventListener("change", updateScaleVariables);
    scale_sqrt_val.addEventListener("change", updateScaleVariables);
    
   
    const unif_label = document.createElement("label");
    unif_label.textContent = "Uniforme";
    const log_label = document.createElement("label");
    log_label.textContent = "Logarítmica";
    const sqrt_label = document.createElement("label");
    sqrt_label.textContent = "Raíz Cuadrada";
    

    
    const reset  = document.createElement("BUTTON");
    reset.innerHTML = "<strong>reset</strong>";
    reset.addEventListener("click", e => {
        max_val.value = "";
        min_val.value = "";
    }); 


    const submit  = document.createElement("BUTTON");
    submit.innerHTML = "<strong>Ok</strong>";
    submit.addEventListener("click", e => {
        if (max_val.value == "") colormapMaxVal = "range";
        else colormapMaxVal = parseFloat(max_val.value);
        
        if (min_val.value == "") colormapMinVal = "range";
        else colormapMinVal = parseFloat(min_val.value);

        updateColorBar();
        renderClusters();
    }); 
    
    const first_row  = document.createElement("div");
    const second_row  = document.createElement("div");
    const third_row  = document.createElement("div");

    first_row.append(min_val_label);       
    first_row.append(min_val);
    first_row.append(excludeOORmin_label);
    first_row.append(excludeOORmin_checkbox);
    first_row.append(max_val_label);
    first_row.append(max_val);
    first_row.append(excludeOORmax_label);
    first_row.append(excludeOORmax_checkbox);
    second_row.appendChild(scale_unif_val);
    second_row.appendChild(unif_label);
    second_row.appendChild(scale_log_val);
    second_row.appendChild(log_label);
    second_row.appendChild(scale_sqrt_val);
    second_row.appendChild(sqrt_label);
    third_row.append(reset);
    third_row.append(submit);
    div.append(first_row);
    div.append(second_row);
    div.append(third_row);

    return div;
}   

function buildSizeSelector() {
    const size_label  = document.createElement("label");
    size_label.innerHTML = "<strong>Tamaño de clusters por:</strong><br>";
    
    const size_select = document.createElement("select");
    size_select.style.marginTop = "4px";
    size_select.style.marginBottom = "10px"

    size_select.appendChild(makeNullOption(sizeVar));
    for (const [CATEGORY, COLS] of Object.entries(VARIABLE_SELECTIONS)) {
        const group = document.createElement("optgroup");
        group.label = CATEGORY
        COLS.forEach(col => {
            //if (!LABEL_MAP[col]) return;
            const opt   = document.createElement("option");
            opt.value   = col;
            opt.text    = LABEL_MAP[col] || col;
            opt.selected = (col === colorVar);
            group.appendChild(opt);
        });
        size_select.appendChild(group);
    };

    size_select.addEventListener("change", e => {
        sizeVar = e.target.value;
        renderClusters(sizeVar);
    });

    const div = document.createElement("div");

    div.appendChild(size_label);
    div.appendChild(size_select);

    return div;
}

function buildSelector() {
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
        position: "fixed", top: "80px", right: "10px", zIndex: "1000",
        background: "white", padding: "10px", borderRadius: "5px",
        boxShadow: "0 0 8px rgba(0,0,0,0.25)", fontSize: "13px"
    });

    wrap.appendChild(buildClusterSelector());
    wrap.appendChild(buildNetworkSelector());
    wrap.appendChild(buildColorSelector());
    wrap.appendChild(buildColorBarSelector());
    wrap.appendChild(buildSizeSelector());

    document.body.appendChild(wrap);
}

// ── data loading ───────────────────────────────────────────────────────────
async function loadData() {
    let clustersRes, metaRes, edgesRes, clusterHulls, variable_groups,
        variable_labels, cluster_alias;
    
    [clustersRes, metaRes, edgesRes, clusterHulls, variable_groups,
        variable_labels, cluster_alias] = await Promise.all([
        fetch("data/cluster_stats.json"),
        fetch("data/meta.json"),
        fetch("data/edges.json"),
        fetch("data/cluster_hulls.json"),
        fetch("data/variable_groups.json"),
        fetch("data/variable_labels.json"),
        fetch("data/cluster_alias.json")
    ]);
    //}

    CLUSTERS  = await clustersRes.json();
    const meta = await metaRes.json();
    RANGES    = meta.ranges;
    COL_NAMES = meta.columns;
    EDGES_DATA = await edgesRes.json();
    HULLS     = await clusterHulls.json();
    VARIABLE_SELECTIONS = await variable_groups.json();
    LABEL_MAP = await variable_labels.json();
    CLUSTER_ALIAS = await cluster_alias.json();

    // center map on data
    const avgLat = CLUSTERS.reduce((s, c) => s + c.cent_lat, 0) / CLUSTERS.length;
    const avgLon = CLUSTERS.reduce((s, c) => s + c.cent_lon, 0) / CLUSTERS.length;
    map.setView([avgLat, avgLon], 10);

    renderEdges();
    buildSelector();
    renderClusters();
}

loadData().catch(err => console.error("Failed to load data:", err));
