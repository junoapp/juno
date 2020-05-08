import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';

const MapChart = ({ dataset }) => {
  const [countryShapes, setCountryShapes] = useState(null);
  // const [dataset, setDataset] = useState<any[]>([]);

  useEffect(() => {
    const initialize = async () => {
      setCountryShapes(
        await d3.json(`${process.env.PUBLIC_URL}world-geojson.json`)
      );
      // setDataset(await d3.csv(`${process.env.PUBLIC_URL}data_bank_data.csv`));
    };

    initialize();
  }, []);

  useEffect(() => {
    if (countryShapes && dataset && dataset.length > 0) {
      let metricDataByCountry = {};

      dataset.forEach((d) => {
        metricDataByCountry[d['Country_Region']] = +d['Confirmed'] || 0;
      });
      console.log(metricDataByCountry);

      const dimensions = {
        width: window.innerWidth * 0.9,
        height: 0,
        margin: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        },
        boundedWidth: 0,
        boundedHeight: 0,
      };

      dimensions.boundedWidth =
        dimensions.width - dimensions.margin.left - dimensions.margin.right;

      const sphere = { type: 'Sphere' };
      const projection = d3
        .geoEqualEarth()
        .fitWidth(dimensions.boundedWidth, sphere);
      const pathGenerator = d3.geoPath(projection);
      const [[x0, y0], [x1, y1]] = pathGenerator.bounds(sphere);

      dimensions.boundedHeight = y1;
      dimensions.height =
        dimensions.boundedHeight +
        dimensions.margin.top +
        dimensions.margin.bottom;

      const wrapper = d3
        .select('#wrapper-map')
        .append('svg')
        .attr('width', dimensions.width)
        .attr('height', dimensions.height);

      const bounds = wrapper
        .append('g')
        .style(
          'transform',
          `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
        );

      const metricValues = Object.values(metricDataByCountry);
      const metricValueExtent = d3.extent(metricValues);
      const maxChange = d3.max([-metricValueExtent[0], metricValueExtent[1]]);

      const colorScale = d3
        .scaleLinear()
        .domain([-maxChange, 0, maxChange])
        .range(['indigo', 'white', 'darkgreen']);

      const earth = bounds
        .append('path')
        .attr('class', 'earth')
        .attr('fill', '#E5F1F1')
        .attr('d', pathGenerator(sphere));

      const graticuleJson = d3.geoGraticule10();

      const graticule = bounds
        .append('path')
        .attr('class', 'graticule')
        .attr('fill', 'none')
        .attr('stroke', '#CFDDDE')
        .attr('d', pathGenerator(graticuleJson));

      const countries = bounds
        .selectAll('.country')
        .data(countryShapes.features)
        .enter()
        .append('path')
        .attr('class', 'country')
        .attr('d', pathGenerator)
        .attr('fill', (d) => {
          return '#e2e6e9';
        })
        .attr('stroke', '#ccc');

      countries
        .on('mouseenter', function () {
          d3.select(this).attr('fill', '#eaeaea');
        })
        .on('mouseleave', function () {
          d3.select(this).attr('fill', '#e2e6e9');
        });

      const legendGroup = wrapper
        .append('g')
        .attr(
          'transform',
          `translate(120, ${
            dimensions.width < 800
              ? dimensions.boundedHeight - 30
              : dimensions.boundedHeight * 0.5
          })`
        );

      const legendTitle = legendGroup
        .append('text')
        .attr('y', -23)
        .attr('class', 'legend-title')
        .text('Population growth')
        .style('font-size', '1.2em')
        .style('text-anchor', 'middle');

      const legendByline = legendGroup
        .append('text')
        .attr('y', -9)
        .attr('class', 'legend-byline')
        .text('Percent change in 2017')
        .style('font-size', '0.8em')
        .style('text-anchor', 'middle')
        .attr('fill', '#666');

      const legendGradientId = 'legend-gradient';

      const gradient = wrapper
        .append('defs')
        .append('linearGradient')
        .attr('id', legendGradientId)
        .selectAll('stop')
        .data(colorScale.range())
        .enter()
        .append('stop')
        .attr('stop-color', (d) => d)
        .attr('offset', (d, i) => `${(i * 100) / 2}%`);

      const legendWidth = 120;
      const legendHeight = 16;
      const legendGradient = legendGroup
        .append('rect')
        .attr('x', -legendWidth / 2)
        .attr('height', legendHeight)
        .attr('width', legendWidth)
        .style('fill', `url(#${legendGradientId})`);

      const legendValueRight = legendGroup
        .append('text')
        .attr('class', 'legend-value')
        .attr('x', legendWidth / 2 + 10)
        .attr('y', legendHeight / 2 + 5)
        .text(maxChange)
        .style('font-size', '0.8em')
        .style('fill', '#666');

      const legendValueLeft = legendGroup
        .append('text')
        .attr('class', 'legend-value')
        .attr('x', -legendWidth / 2 - 10)
        .attr('y', legendHeight / 2 + 5)
        .text(-maxChange)
        .style('text-anchor', 'end')
        .style('font-size', '0.8em')
        .style('fill', '#666');

      const max = d3.max(dataset, (d) => d.Confirmed);
      const logScale = d3.scaleLog().domain([1, max]).range([1, 10]);

      const tooltip = d3.select('#tooltip-map');
      function onMouseEnter(datum) {
        tooltip.style('opacity', 1);

        tooltip.selectAll('#name').text(datum.Country_Region);
        tooltip.select('#value1').text(`Confirmed: ${datum.Confirmed}`);
        tooltip.select('#value2').text(`Recovered: ${datum.Recovered}`);
        tooltip.select('#value3').text(`Deaths: ${datum.Deaths}`);

        const [centerX, centerY] = projection([datum.Long_, datum.Lat]);
        const x = centerX + dimensions.margin.left;
        const y = centerY + dimensions.margin.top;

        tooltip.style(
          'transform',
          `translate(calc(-50% + ${x}px), calc(-100% + ${y}px))`
        );
      }

      function onMouseLeave(datum) {
        tooltip.style('opacity', 0);
      }

      const dotsByCountry = bounds
        .selectAll('circle.confirmed')
        .data(dataset.filter((d) => d.Confirmed > 0))
        .enter()
        .append('circle')
        .attr('class', 'confirmed')
        .attr('cx', (d) => projection([d.Long_, d.Lat])[0])
        .attr('cy', (d) => projection([d.Long_, d.Lat])[1])
        .attr('r', 0)
        .attr('fill', '#919AD7')
        .attr('opacity', 0.7);
      dotsByCountry
        .transition()
        .duration(600)
        .attr('r', (d) => logScale(+d.Confirmed));

      dotsByCountry
        .on('mouseenter', onMouseEnter)
        .on('mouseleave', onMouseLeave);
    }
  }, [countryShapes, dataset]);

  return (
    <div
      id="wrapper-map"
      style={{
        position: 'relative',
      }}
    >
      <div
        id="tooltip-map"
        style={{
          position: 'absolute',
          fontSize: 12,
          padding: 10,
          border: '1px solid #ccc',
          opacity: 0,
          backgroundColor: '#fff',
          pointerEvents: 'none',
        }}
      >
        <div>
          <strong id="name"></strong>
        </div>
        <div id="value1"></div>
        <div id="value2"></div>
        <div id="value3"></div>
      </div>
    </div>
  );
};

export default MapChart;
