import React, { useEffect, useState, useRef } from 'react';
import mapbox from 'mapbox-gl';
import * as d3 from 'd3';

import './index.css';

mapbox.accessToken =
  'pk.eyJ1IjoicGF1bG9tZW5lemVzIiwiYSI6ImNrMHZrc3Z2NjEwODMzbG52emduZWFkeTIifQ.fUByXk2mj50HO1xPDiTr5w';

function MapBox({ dataset, latField, lngField }) {
  const [initialized, setInitialized] = useState(false);
  const [lng, setLng] = useState(5);
  const [lat, setLat] = useState(34);
  const [zoom, setZoom] = useState(2);

  const mapContainer = useRef(null);

  useEffect(() => {
    if (!initialized) {
      const map = new mapbox.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v10', // 'mapbox://styles/mapbox/streets-v11',
        center: [lng, lat],
        zoom: zoom,
      });

      map.scrollZoom.disable();
      map.addControl(new mapbox.NavigationControl({ showCompass: false }));

      // D3js
      const container = map.getCanvasContainer();
      const svg = d3
        .select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('position', 'absolute')
        .style('top', 0)
        .style('left', 0);

      setInitialized(true);

      const max = d3.max(dataset, (d) => d.Confirmed);
      const logScale = d3.scaleLog().domain([1, max]).range([1, 10]);

      function draw() {
        const boundingBox = mapContainer.current.getBoundingClientRect();
        const center = map.getCenter();
        const zoom = map.getZoom();
        const scale = ((512 * 0.5) / Math.PI) * Math.pow(2, zoom || 1);
        const sphere = { type: 'Sphere' };

        const projection = d3
          .geoMercator()
          .center([center.lng, center.lat])
          .fitWidth(boundingBox.width, sphere)
          .fitHeight(boundingBox.height, sphere)
          .translate([boundingBox.width / 2, boundingBox.height / 2])
          .scale(scale);

        const points = svg
          .selectAll('circle.station')
          .data(dataset.filter((d) => d.Confirmed > 0));

        points
          .enter()
          .append('circle')
          .attr('class', 'station')
          .attr('cx', (d) => projection([d[lngField], d[latField]])[0])
          .attr('cy', (d) => projection([d[lngField], d[latField]])[1])
          .attr('r', 0)
          .attr('fill', '#919AD7')
          .attr('opacity', 0.7)
          .transition()
          .duration(600)
          .attr('r', (d) => logScale(+d.Confirmed));

        points
          .attr('cx', (d) => projection([d[lngField], d[latField]])[0])
          .attr('cy', (d) => projection([d[lngField], d[latField]])[1]);

        points.on('click', function (datum) {
          map.flyTo({ center: [datum[lngField], datum[latField]], zoom: 3 });
        });
      }

      draw();

      map.on('move', () => {
        setLng(map.getCenter().lng.toFixed(4));
        setLat(map.getCenter().lat.toFixed(4));
        setZoom(map.getZoom().toFixed(2));

        draw();
      });
    }
  }, [lat, lng, zoom, initialized, dataset, latField, lngField]);

  return (
    <div style={{ position: 'relative', height: 800 }}>
      <div ref={(el) => (mapContainer.current = el)} className="mapContainer" />
    </div>
  );
}

export default MapBox;
