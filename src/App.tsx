import React, { useEffect, useState } from 'react';
import dl from 'datalib';
import * as d3 from 'd3';
import MapChart from './MapChart';
import MapBox from './Mapbox';

const load = (url: string) => {
  return new Promise((resolve, reject) => {
    dl.csv(url, {}, (err: any, data: any[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

class ChartDefinitiom {
  type!: 'geo' | 'scorecard' | 'table';
  data!: any | any[];
  options!: {
    lat?: string;
    lng?: string;
    name?: string;
  };
}

const numberFormat = new Intl.NumberFormat();

function App() {
  // const [data, setData] = useState<any[]>([]);
  const [charts, setCharts] = useState<Array<ChartDefinitiom>>([]);

  useEffect(() => {
    const loads: Promise<any>[] = [
      load(`${process.env.PUBLIC_URL}countries.csv`),
    ];
    // loads.push(load(`${process.env.PUBLIC_URL}Bing-COVID19-Data.csv`));
    for (let i = 20; i <= 29; i++) {
      loads.push(load(`${process.env.PUBLIC_URL}04-${i}-2020.csv`));
    }

    Promise.all(loads).then(([countries, ...dataLoad]: any[]) => {
      console.log(countries);
      const data = dataLoad.flat();

      const summary: any[] = dl.summary(data);

      const geoNames = [
        'country',
        'state',
        'region',
        'province',
        'admin2',
        'fips',
      ];
      const latNames = ['lat', 'latitude'];
      const lngNames = ['longitude', 'long', 'lng', 'long_'];

      for (const column of summary) {
        const name: string = column.field.toLowerCase();
        const parts = name.split('_');

        if (
          column.type === 'number' &&
          `${Object.keys(column.unique)[0]}`.length === 13
        ) {
          const date = new Date(+Object.keys(column.unique)[0]);
          if (date.toString() !== 'Invalid Date') {
            column.type = 'date';
          }
        } else if (
          column.type === 'string' &&
          geoNames.find((d) => parts.find((p) => d.includes(p)))
        ) {
          column.type = 'geo';
        } else if (
          column.type === 'number' &&
          geoNames.find((d) => parts.find((p) => d.includes(p)))
        ) {
          column.type = 'geo';
        } else if (column.type === 'number') {
          if (latNames.find((d) => d.includes(name))) {
            column.type = 'lat';
          } else if (lngNames.find((d) => d.includes(name))) {
            column.type = 'lng';
          } else {
            column.indicator = true;
          }
        }
      }
      console.log(summary);

      const hasGeo = summary.some((d) => ['lat', 'lng'].includes(d.type));
      const hasTime = summary.some((d) => ['date'].includes(d.type));

      console.log(hasGeo, hasTime);

      // const keys = summary.filter(
      //   (a) => ['string', 'date'].includes(a.type) && a.distinct < data.length
      // );

      // const newKeys = keys.sort((a, b) => {
      //   if (a.missing !== b.missing) {
      //     return a.missing - b.missing;
      //   }

      //   return a.distinct - b.distinct;
      // });
      const newKeys = [
        { field: 'Last_Update' },
        { field: 'Country_Region' },
        { field: 'Province_State' },
        { field: 'Admin2' },
      ];

      console.log(newKeys);

      function recursiveGroupBy(
        group: any,
        keys: any[],
        index: number,
        dataset: any[]
      ) {
        if (keys.length === index) {
          return group;
        } else {
          const g = dl.groupby(keys[index].field).execute(dataset);
          group.group = g;
          index++;
          for (let i = 0; i < g.length; i++) {
            const item = g[i];
            recursiveGroupBy(item, keys, index, item.values);
          }
          return g;
        }
      }

      const grouped = recursiveGroupBy([], newKeys, 0, data);
      const mainData = grouped.sort((a, b) => b.Last_Update - a.Last_Update)[0];

      console.log('mainData', mainData);

      const ranking: any[] = [];
      for (const g of mainData.group) {
        const r = {
          name: g.Country_Region,
          indicators: [] as any[],
        };

        for (const column of summary) {
          if (column.indicator) {
            const sum = dl.sum(g.values, (d) => d[column.field]);
            r.indicators.push({
              name: column.field,
              value: sum,
            });
          }
        }

        ranking.push(r);
      }

      const newCharts: ChartDefinitiom[] = [];

      ranking.sort((a, b) => b.indicators[0].value - a.indicators[0].value);

      console.log('ranking', ranking);

      newCharts.push({
        type: 'table',
        data: ranking,
        options: {},
      });

      //

      // alert('midPoint = ' + midPoint[0] + ', ' + midPoint[1]);
      // main function
      // function getPointByDistance(points: number[][], distance: number) {
      //   let cl = 0;
      //   let ol: number;
      //   let result: number[] | undefined;

      //   points.forEach((point, i, points) => {
      //     ol = cl;
      //     cl += i ? lineLen([points[i - 1], point]) : 0;
      //     if (distance <= cl && distance > ol) {
      //       const dd = distance - ol;
      //       result = pntOnLine([points[i - 1], point], dd);
      //     }
      //   });

      //   return result;
      // }
      // // returns a point on a single line (two points) using distance // line=[[x0,y0],[x1,y1]]
      // function pntOnLine(line: number[][], distance: number) {
      //   const t = distance / lineLen(line);
      //   const xt = (1 - t) * line[0][0] + t * line[1][0];
      //   const yt = (1 - t) * line[0][1] + t * line[1][1];
      //   return [xt, yt];
      // }
      // // returns the total length of a linestring (multiple points) // pnts=[[x0,y0],[x1,y1],[x2,y2],...]
      // function totalLen(points: number[][]) {
      //   let tl = 0;
      //   points.forEach((point, i, points) => {
      //     tl += i ? lineLen([points[i - 1], point]) : 0;
      //   });

      //   return tl;
      // }
      // // returns the length of a line (two points) // line=[[x0,y0],[x1,y1]]
      // function lineLen(line: number[][]) {
      //   const xd = line[0][0] - line[1][0];
      //   const yd = line[0][1] - line[1][1];
      //   return Math.sqrt(xd * xd + yd * yd);
      // }
      //

      if (hasGeo) {
        if (hasTime) {
          // const timeColumn = summary.find((s) => s.type === 'date');
          // const maxTime = d3.max<number>(
          //   Object.keys(timeColumn.unique).map((o) => +o)
          // );

          // if (maxTime) {
          // console.log(timeColumn, maxTime);
          // const mapData = data.filter(
          //   (d) => d[timeColumn.field] === +maxTime
          // );
          const mapData = mainData.values;

          console.log(mapData);

          for (const column of summary) {
            if (column.indicator) {
              const sum = dl.sum(mapData, (d) => d[column.field]);

              newCharts.push({
                type: 'scorecard',
                data: sum,
                options: {
                  name: column.field,
                },
              });
            }
          }

          newCharts.push({
            type: 'geo',
            data: mapData,
            options: {
              lat: summary.find((s) => s.type === 'lat').field,
              lng: summary.find((s) => s.type === 'lng').field,
            },
          });

          setCharts(newCharts);

          // const mapDataset: any[] = [];
          // const mapGroups = grouped.find((g) => g.Last_Update === maxTime);

          // for (const mapGroup of mapGroups.group) {
          //   const data = {
          //     Country_Region: mapGroup.Country_Region,
          //     Active: 0,
          //     Confirmed: 0,
          //     Deaths: 0,
          //     Lat: 0,
          //     Long_: 0,
          //     Recovered: 0,
          //   };

          //   const coordinates: Array<number[]> = [];

          //   for (const value of mapGroup.values) {
          //     data.Active += value.Active;
          //     data.Confirmed += value.Confirmed;
          //     data.Deaths += value.Deaths;
          //     data.Recovered += value.Recovered;

          //     coordinates.push([value.Lat, value.Long_]);
          //   }

          //   const findCountry = countries.find(
          //     (c) =>
          //       c.country === mapGroup.Country_Region ||
          //       c.name === mapGroup.Country_Region
          //   );
          //   if (findCountry) {
          //     data.Lat = findCountry.latitude;
          //     data.Long_ = findCountry.longitude;
          //   } else {
          //     const totalLength = totalLen(coordinates);
          //     const midDistance = totalLength / 2;
          //     const midPoint = getPointByDistance(coordinates, midDistance);
          //     if (midPoint) {
          //       data.Lat = midPoint[0];
          //       data.Long_ = midPoint[1];
          //     } else {
          //       data.Lat = coordinates[0][0];
          //       data.Long_ = coordinates[0][1];
          //     }
          //   }

          //   mapDataset.push(data);
          // }

          // setData(mapData);
          // }
        }
      }

      // console.log(data);
      // data.sort((a, b) => a.Last_Update - b.Last_Update);

      // setSpec({
      //   width: 1000,
      //   height: 200,
      //   mark: 'line',
      //   encoding: {
      //     x: { field: keys[0].field, type: 'temporal', timeUnit: 'date' },
      //     y: { field: 'Confirmed', type: 'quantitative', aggregate: 'sum' },
      //   },
      //   data: {
      //     values: data,
      //   },
      // });
    });
  }, []);

  return (
    <div className="App" style={{ position: 'relative' }}>
      {charts.map((c, key) =>
        c.type === 'geo' ? (
          <MapBox
            key={key}
            dataset={c.data}
            latField={c.options.lat}
            lngField={c.options.lng}
          />
        ) : c.type === 'scorecard' ? (
          <div
            key={key}
            style={{ padding: 10, border: '1px solid black', margin: 10 }}
          >
            {c.options.name}: {numberFormat.format(c.data)}
          </div>
        ) : (
          c.type === 'table' && (
            <div key={key} style={{ height: 300, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    {c.data[0].indicators.map((i, index) => (
                      <th key={`${i.name}-${index}`}>{i.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.data.map((d, i) => (
                    <tr key={i}>
                      <td>{d.name}</td>
                      {d.indicators.map((i) => (
                        <td key={i.name}>{numberFormat.format(i.value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )
      )}
      {/* {data && data.length > 0 && <MapChart dataset={data} />} */}
    </div>
  );
}

export default App;
