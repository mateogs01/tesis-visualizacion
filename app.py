from dash import Dash, dcc, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
import plotly.express as px

import numpy as np

import pickle
import json

# %%
with open("data/cluster_stats.pkl", "rb") as fp:
    cluster_stats = pickle.load(fp)

with open("data/muni_info.pkl", "rb") as fp:
    muni_info = pickle.load(fp)

with open("data/cluster_alias.json", "r") as f:
    cluster_alias = json.load(f, object_hook=lambda x: {int(k): v for k, v in x.items()})

with open("data/variable_groups.json", "r") as f:
    variable_groups = json.load(f)

with open("data/variable_labels.json", "r") as f:
    variable_labels = json.load(f)
    
with open("data/regiones.json", "r") as f:
    regiones = json.load(f)

# %%
def make_grouped_options(variables, include_none=False, disable_cat=True, var_labels=None):
    """Create list of options for dbc.Select with disabled category headers."""
    options = []
    if include_none:
        options.append({'label': 'None', 'value': "None"})
    for category, vars_list in variables.items():
        options.append({
            'label': f'─── {category} ───',
            'value': f'__header_{category}',
            'disabled': disable_cat
        })
        for var in vars_list:
            if var in var_labels.keys():
                options.append({'label': f'    {var_labels[var]}', 'value': var})
            else:
                options.append({'label': f'    {var}', 'value': var})
    return options


dropdown_options_all = make_grouped_options(variable_groups, include_none=False, var_labels=variable_labels)
dropdown_options_with_none = make_grouped_options(variable_groups, include_none=True, var_labels=variable_labels)
dropdown_municipio_options = make_grouped_options(regiones, disable_cat=False,var_labels=variable_labels)

paleta_colores  = ["#8342e2", "#46bcdc", "#9ed23c", "#facb0e", "#ed571f", "#485a60"]
paleta_colores2 =  ["#bc97f8", "#93e5f1", "#caf679", "#f7f490", "#ef9b7d", "#acbfc9"]

colores = dict(zip(list(regiones.keys()), paleta_colores))
colores2 = dict(zip(list(regiones.keys()), paleta_colores2))
# %%
app = Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])

app.layout = dbc.Container([
    # html.H1('Interactive Data Explorer', className='text-center my-4'),

    # ---- Histogram section ----
    dbc.Card([
        dbc.CardBody([
            # html.H4('Histograma', className='card-title'),
            dbc.Row([
                dbc.Col(dcc.Graph(id='histogram-graph')),
                dbc.Col([
                    dbc.Label('Variable 1', className='fw-bold'),
                    dbc.Select(
                        id='var1-select',
                        options=dropdown_options_with_none,
                        value="route_count"
                    ),
                    dbc.Label('Variable 2', className='fw-bold'),
                    dbc.Select(
                        id='var2-select',
                        options=dropdown_options_with_none,
                        value="trip_count"
                    ),
                    dbc.Label('Porcentaje', className='fw-bold'),
                    dbc.RadioItems(
                        id='hist-perc',
                        options=[
                            {'label': 'Si', 'value': True},
                            {'label': 'No', 'value': False}
                        ],
                        value=True,
                        inline=True
                    ),
                    dbc.Label('Escala Uniforme', className='fw-bold'),
                    dbc.RadioItems(
                        id='hist-unif',
                        options=[
                            {'label': 'Si', 'value': True},
                            {'label': 'No', 'value': False}
                        ],
                        value=False,
                        inline=True
                    ),
                    dbc.Label('Seleccionar Region', className='fw-bold'),
                    dbc.Checklist(
                        id='hist-region',
                        options=[{'label': 'CABA', 'value': 'CABA'},
                                 {'label': 'Zona Oeste', 'value': 'Zona Oeste'},
                                 {'label': 'Zona Sur', 'value': 'Zona Sur'},
                                 {'label': 'Zona Norte', 'value': 'Zona Norte'},
                                 {'label': 'La Plata', 'value': 'La Plata'},
                                 {'label': 'Otros', 'value': 'Otros'}
                                 ],
                        value = list(regiones.keys()),
                        labelStyle = {'display': 'block'}
                    ),
                ], width=4)
            ])
        ])
    ], className='mb-4'),
    
    # ---- Region Dist section ----
    dbc.Card([
        dbc.CardBody([
            # html.H4('Histograma', className='card-title'),
            dbc.Row([
                dbc.Col(dcc.Graph(id='region_dist-graph')),
                dbc.Col([
                    dbc.Label('Variable', className='fw-bold'),
                    dbc.Select(
                        id='region_dist-var',
                        options=dropdown_options_with_none,
                        value="route_count"
                    ),
                    dbc.Label('Porcentaje', className='fw-bold'),
                    dbc.RadioItems(
                        id='region_dist-perc',
                        options=[
                            {'label': 'Si', 'value': True},
                            {'label': 'No', 'value': False}
                        ],
                        value=True,
                        inline=True
                    ),
                    dbc.Label('Escala Uniforme', className='fw-bold'),
                    dbc.RadioItems(
                        id='region_dist-unif',
                        options=[
                            {'label': 'Si', 'value': True},
                            {'label': 'No', 'value': False}
                        ],
                        value=False,
                        inline=True
                    ),
                    dbc.Label('Seleccionar Region', className='fw-bold'),
                    dbc.Checklist(
                        id='region_dist-region',
                        options=[{'label': 'CABA', 'value': 'CABA'},
                                 {'label': 'Zona Oeste', 'value': 'Zona Oeste'},
                                 {'label': 'Zona Sur', 'value': 'Zona Sur'},
                                 {'label': 'Zona Norte', 'value': 'Zona Norte'},
                                 {'label': 'La Plata', 'value': 'La Plata'},
                                 {'label': 'Otros', 'value': 'Otros'}
                                 ],
                        value = list(regiones.keys()),
                        labelStyle = {'display': 'block'}
                    ),
                ], width=4)
            ])
        ])
    ], className='mb-4'),

    # ---- Scatter section ----
    dbc.Card([
        dbc.CardBody([
            # html.H4('Scatter', className='card-title'),
            dbc.Row([
                dbc.Col(dcc.Graph(id='scatter-graph')),
                dbc.Col([
                    dbc.Label('Eje X', className='fw-bold'),
                    dbc.Select(
                        id='x-select',
                        options=dropdown_options_all,
                        value="route_count"
                    ),
                    dbc.Label('Eje Y', className='fw-bold'),
                    dbc.Select(
                        id='y-select',
                        options=dropdown_options_all,
                        value="trip_count"
                    ),                    
                    dbc.Label('Regresión lineal', className='fw-bold'),
                    dbc.RadioItems(
                        id='regression',
                        options=[
                            {'label': 'Si', 'value': True},
                            {'label': 'No', 'value': False}
                        ],
                        value=True,
                        inline=True
                    ),
                    dbc.Label('Colorear por', className='fw-bold'),
                    dbc.Select(
                        id='color-select',
                        options=[{'label': 'None', 'value': "None"}] + dropdown_options_all,
                        value="region_nombre"
                    ),
                    dbc.Label('Seleccionar Region', className='fw-bold'),
                    dbc.Checklist(
                        id='scatter-region',
                        options=[{'label': 'CABA', 'value': 'CABA'},
                                 {'label': 'Zona Oeste', 'value': 'Zona Oeste'},
                                 {'label': 'Zona Sur', 'value': 'Zona Sur'},
                                 {'label': 'Zona Norte', 'value': 'Zona Norte'},
                                 {'label': 'La Plata', 'value': 'La Plata'},
                                 {'label': 'Otros', 'value': 'Otros'}
                                 ],
                        value = list(regiones.keys()),
                        labelStyle = {'display': 'block'}
                    ),
                ], width=4)
            ])
        ])
    ], className='mb-4'),
    
    # ---- Boxplot section ----
    dbc.Card([
        dbc.CardBody([
            # html.H4('Boxplot', className='card-title'),
            dbc.Row([
            dbc.Col(dcc.Graph(id='boxplot-graph')),
                dbc.Col([
                    dbc.Label('Variable', className='fw-bold'),
                    dbc.Select(
                        id='var-select',
                        options=dropdown_options_all,
                        value="route_count"
                    ),
                    dbc.Label('Ordenar por', className='fw-bold'),
                    dbc.Select(
                        id='order-select',
                        options=[{'label': 'Mediana', 'value': 'median'},
                                 {'label': 'Promedio', 'value': 'mean'},
                                 {'label': 'Máximo', 'value': 'max'},
                                 {'label': 'Minimo', 'value': 'min'},
                                 {'label': 'Nombre', 'value': 'nombre'},
                                 {'label': 'Densidad Poblacional', 'value': 'density'},],
                        value="median"
                    ),
                    dbc.Label('Seleccionar Region', className='fw-bold'),
                    dbc.Checklist(
                        id='box-region',
                        options=[{'label': 'CABA', 'value': 'CABA'},
                                 {'label': 'Zona Oeste', 'value': 'Zona Oeste'},
                                 {'label': 'Zona Sur', 'value': 'Zona Sur'},
                                 {'label': 'Zona Norte', 'value': 'Zona Norte'},
                                 {'label': 'La Plata', 'value': 'La Plata'},
                                 {'label': 'Otros', 'value': 'Otros'}
                                 ],
                        value = list(regiones.keys()),
                        labelStyle = {'display': 'block'}
                    ),
                ], width=4)
            ])
        ])
    ], className='mb-4'),

], fluid=True)


# ---- Histogram callback ----
@app.callback(
    Output('histogram-graph', 'figure'),
    Input('var1-select', 'value'),
    Input('var2-select', 'value'),
    Input('hist-perc', 'value'),
    Input('hist-unif', 'value'),
    Input('hist-region', 'value')
)
def update_histogram(var1, var2, percentage, uniform, regions):
    if var1 == "None" and var2 == "None":
        return go.Figure()

    df = cluster_stats[cluster_stats["region_nombre"].isin(regions)]
    if df.empty:
        return go.Figure()

    histnorm = 'percent' if percentage else None
    y_title = 'Porcentaje (%)' if percentage else 'Cantidad'
    
    col1 = paleta_colores[0]
    col2 = paleta_colores[4]
    
    scale1 = df[var1].max() if (var1 != "None" and  uniform) else 1
    scale2 = df[var2].max() if (var2 != "None" and  uniform) else 1
    x_title = 'Valor Uniforme' if uniform else 'Valor'
    
    if var1 == "None":
        title=f'Distibución de {variable_labels[var2]}'
    elif var2 == "None":
        title=f'Distibución de {variable_labels[var1]}'
    else:
        title=f'Comparando {variable_labels[var1]} vs {variable_labels[var2]}'
        
    fig = go.Figure()
    if var1 != "None":
        fig.add_trace(go.Histogram(x=df[var1]/scale1, name=var1,
                                   marker_color=col1, opacity=0.6, histnorm=histnorm))
    if var2 != "None":
        fig.add_trace(go.Histogram(x=df[var2]/scale2, name=var2,
                                   marker_color=col2, opacity=0.6, histnorm=histnorm))
    fig.update_layout(
        barmode='overlay',
        title=title,
        xaxis_title=x_title,
        yaxis_title=y_title,
        height=500,
        template='plotly_white'
    )
    return fig


# ---- Region Dist callback ----
@app.callback(
    Output('region_dist-graph', 'figure'),
    Input('region_dist-var', 'value'),
    Input('region_dist-perc', 'value'),
    Input('region_dist-unif', 'value'),
    Input('region_dist-region', 'value')
)
def update_region_dist(var, percentage, uniform, regions):
    if var == "None":
        return go.Figure()

    df = cluster_stats[cluster_stats["region_nombre"].isin(regions)]
    if df.empty:
        return go.Figure()
    
    histnorm = 'percent' if percentage else None
    y_title = 'Porcentaje (%)' if percentage else 'Cantidad'
    x_title = 'Valor Uniforme' if uniform else 'Valor'

    title=f'Comparando {variable_labels[var]} por regiones'
    fig = go.Figure()

    for region, clusters in df.groupby("region_nombre"):
        scale = clusters[var].max() if (var != "None" and uniform) else 1
    
        fig.add_trace(go.Histogram(
                x=clusters[var]/scale,
                name=region,
                opacity=1/len(regions),
                histnorm=histnorm,
                marker_color=colores[region]
                    ))

    fig.update_layout(
        barmode='overlay',
        title=title,
        xaxis_title=x_title,
        yaxis_title=y_title,
        height=500,
        template='plotly_white'
    )
    return fig


# ---- Scatter callback ----
@app.callback(
    Output('scatter-graph', 'figure'),
    Input('x-select', 'value'),
    Input('y-select', 'value'),
    Input('color-select', 'value'),
    Input('scatter-region', 'value'),
    Input('regression', 'value')
)
def update_scatter(x_var, y_var, color_var, regions, regression):
    if x_var == "None" or y_var == "None":
        return go.Figure()

    fig = go.Figure()
    
    df = cluster_stats[cluster_stats["region_nombre"].isin(regions)]
    if df.empty:
        return go.Figure()

    index_vals = [cluster_alias[c] if c in cluster_alias else c for c in df.index]

    if color_var == 'None':
        fig.add_trace(go.Scatter(
            x=df[x_var],
            y=df[y_var],
            mode='markers',
            name=None,
            marker=dict(size=10, opacity=0.4, color=paleta_colores[5]),
            showlegend=False,
            text=index_vals,
            hovertemplate='Index: %{text}<br>' + f'{x_var}: %{{x:.2f}}<br>{y_var}: %{{y:.2f}}<extra></extra>'
        ))
    
    else:
        is_categorical = (df[color_var].dtype.name == 'object' or 
                          df[color_var].dtype.name == 'category')
        
        if is_categorical:
            unique_cats = df[color_var].unique()

            if color_var == "region_nombre":
                color_map =  dict(zip(list(regiones.keys()), paleta_colores))
            else:
                colors = px.colors.qualitative.Plotly
                color_map = {cat: colors[i % len(colors)] for i, cat in enumerate(unique_cats)}

            for cat in unique_cats:
                subset = df[df[color_var] == cat]
                fig.add_trace(go.Scatter(
                    x=subset[x_var],
                    y=subset[y_var],
                    mode='markers',
                    name=str(cat),
                    marker=dict(size=10, opacity=0.4, color=color_map[cat]),
                    text=subset.index,  # assuming index_vals is the index
                    hovertemplate='Index: %{text}<br>' +
                                  f'{x_var}: %{{x:.2f}}<br>{y_var}: %{{y:.2f}}<br>{color_var}: {cat}<extra></extra>'
                ))
        else:
            fig.add_trace(go.Scatter(
                x=df[x_var],
                y=df[y_var],
                mode='markers',
                name=None,
                marker=dict(
                    size=10,
                    opacity=0.6,
                    color=df[color_var],
                    colorscale='Viridis',
                    colorbar=dict(title=color_var, thickness=15, len=0.7, x=1.02),
                    showscale=True
                ),
                text=index_vals,
                showlegend=False,
                hovertemplate='Index: %{text}<br>' +
                              f'{x_var}: %{{x:.2f}}<br>{y_var}: %{{y:.2f}}<br>{color_var}: %{{marker.color:.2f}}<extra></extra>'
            ))
    
    if regression:
        if len(df) < len(cluster_stats):
            slope, intercept = np.polyfit(df[x_var], df[y_var], 1)
        
            x_line = np.array([df[x_var].min(), df[x_var].max()])
            y_line = slope * x_line + intercept
            
            y_pred = slope * df[x_var] + intercept
            ss_res = np.sum((df[y_var] - y_pred) ** 2)
            ss_tot = np.sum((df[y_var] - np.mean(df[y_var])) ** 2)
            r2 = 1 - (ss_res / ss_tot)
            
            fig.add_trace(go.Scatter(
                x=x_line,
                y=y_line,
                mode='lines',
                line=dict(color=paleta_colores[2], width=3),
                name=f'Regresión<br>y = {slope:.2g}x + {intercept:.2g}<br>R² = {r2:.4f}',
                hovertemplate=f'{x_var}: %{{x:.2f}}<br>Predicted {y_var}: %{{y:.2f}}<extra></extra>'
            ))
            
        slope, intercept = np.polyfit(cluster_stats[x_var], cluster_stats[y_var], 1)
    
        x_line = np.array([cluster_stats[x_var].min(), cluster_stats[x_var].max()])
        y_line = slope * x_line + intercept
        
        y_pred = slope * cluster_stats[x_var] + intercept
        ss_res = np.sum((cluster_stats[y_var] - y_pred) ** 2)
        ss_tot = np.sum((cluster_stats[y_var] - np.mean(cluster_stats[y_var])) ** 2)
        r2 = 1 - (ss_res / ss_tot)
        
        fig.add_trace(go.Scatter(
            x=x_line,
            y=y_line,
            mode='lines',
            line=dict(color=paleta_colores[4], width=3),
            name=f'Regresión<br>y = {slope:.2g}x + {intercept:.2g}<br>R² = {r2:.4f}',
            hovertemplate=f'{x_var}: %{{x:.2f}}<br>Predicted {y_var}: %{{y:.2f}}<extra></extra>'
        ))
    

    fig.update_layout(
        title=f'{variable_labels[y_var]} vs {variable_labels[x_var]}' + (f' (coloreado por {variable_labels[color_var]})' if color_var and color_var != 'None' else ''),
        xaxis_title=variable_labels[x_var],
        yaxis_title=variable_labels[y_var],
        height=500,
        template='plotly_white',
        legend_font_size=20,
        hovermode='closest'
    )
    fig.update_xaxes(title_font=dict(size=25), tickfont=dict(size=20))
    fig.update_yaxes(title_font=dict(size=25), tickfont=dict(size=20))

    return fig


# ---- Boxplot callback ----
@app.callback(
    Output('boxplot-graph', 'figure'),
    Input('var-select', 'value'),
    Input('order-select', 'value'),
    Input('box-region', 'value')
)
def update_boxplot(var, orderby, regions):
    if var == "None":
        return go.Figure()

    df = cluster_stats[cluster_stats["region_nombre"].isin(regions)]
    if df.empty:
        return go.Figure()
    
    match orderby:
        case "median":
            ordering = df.groupby('muni_nombre')[var].median().sort_values(ascending=False).index
        case "mean":
            ordering = df.groupby('muni_nombre')[var].mean().sort_values(ascending=False).index
        case "max":
            ordering = df.groupby('muni_nombre')[var].max().sort_values(ascending=False).index
        case "min":
            ordering = df.groupby('muni_nombre')[var].min().sort_values(ascending=False).index
        case "nombre":
            ordering = df["muni_nombre"].drop_duplicates().sort_values(ascending=False).values
        case "density":
            subinfo = muni_info.set_index("muni_nombre").loc[df.muni_nombre.unique()]
            ordering = subinfo.muni_densidad_poblacional.sort_values(ascending=False).index
        case _:
            ordering = None
    
    index_vals = [cluster_alias[c] if c in cluster_alias else c for c in df.index]

    fig = go.Figure()

    for muni, data in df.groupby("muni_nombre"):
        region = data["region_nombre"].iloc[0]
        fig.add_trace(go.Box(
            x=data[var],
            hovertext=index_vals,
            fillcolor=colores2[region],
            line_color=colores[region],
            line_width=1,
            showlegend=False,
            name=muni
            )
        )
       
    
    for region in regions:
        fig.add_trace(go.Box(
            x=[None],
            hovertext=index_vals,
            fillcolor=colores2[region],
            line_color=colores[region],
            name=region,
            showlegend=True
        ))
        
    order_label = {
        "median"    : "mediana",
        "min"       : "mínimo",
        "max"       : "máxmio",
        "mean"      : "promedio",
        "nombre"    : "nombre",
        "density"   : "dens. pob."
    }
        
    fig.update_yaxes(categoryorder='array', categoryarray=ordering, tickfont=dict(size=5),showticklabels=False)
    fig.update_traces(boxmean=True, width=0.7)
    fig.update_layout(
        title=f'{variable_labels[var]} por municipio',
        height=600,
        template='plotly_white',
        legend_font_size=20,
        xaxis_title=variable_labels[var],
        yaxis_title= f"Departamento (ordenados por {order_label[orderby]})"
    )
    fig.update_xaxes(title_font=dict(size=25), tickfont=dict(size=20))
    fig.update_yaxes(title_font=dict(size=25), tickfont=dict(size=20))
    return fig

if __name__ == '__main__':
    app.run(debug=True)
    
