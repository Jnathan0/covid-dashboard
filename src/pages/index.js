import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import L from "leaflet";
import { useMap } from "react-leaflet";

import axios from 'axios';          // part 1
import { useTracker } from 'hooks';    // part 2
import { commafy, friendlyDate } from 'lib/util';    // part 2

import Layout from "components/Layout";
import Container from "components/Container";
import Map from "components/Map";
import Snippet from "components/Snippet";

//imports for tables
import { useTable, useSortBy } from "react-table";


const LOCATION = {
  lat: 34.0522,
  lng: -118.2437,
};
const CENTER = [LOCATION.lat, LOCATION.lng];
const DEFAULT_ZOOM = 2;





const IndexPage = () => {
  const { data: countries = [] } = useTracker({
    api: 'countries'
  });
  const hasCountries = Array.isArray(countries) && countries.length > 0;

  console.log('@WILL -- warning: countries is null');
  if (countries) { 
    console.log('@WILL -- countries.length is: ', countries.length); 
  }

  const { data: stats = {} } = useTracker({ api: 'all' });
  
  const dashboardStats = [
    { primary:   { label: 'Total Cases',   value: commafy(stats?.cases) },
      secondary: { label: 'Per 1 Million', value: commafy(stats?.casesPerOneMillion) }
    },
    { primary:   { label: 'Total Deaths',  value: commafy(stats?.deaths) },
      secondary: { label: 'Per 1 Million', value: commafy(stats?.deathsPerOneMillion) }
    },
    { primary:   { label: 'Total Tests',   value: commafy(stats?.tests) },
      secondary: { label: 'Per 1 Million', value: commafy(stats?.testsPerOneMillion) }
    }
  ];

  async function mapEffect(map) { 
    // if (!hasCountries) { 
    //   console.log('@WILL: returning -- hasCountries is false');
    //   return; 
    // }    // part 2

    let response;            // part 1
    console.log('MapEffect automatically called, calling axios.get()');

    try { 
      response = await axios.get('https://corona.lmao.ninja/v2/countries');
    } catch(e) { 
      console.log('Failed to fetch countries: ${e.message}', e);
      return;
    }

    // const { countries = [] } = response;  // part 2
    // console.log(countries);
    const { data = [] } = response;   // part 1
    console.log(data);

    // const hasData = Array.isArray(countries) && countries.length > 0;  // part 2
    // if ( !hasData ) return;

    const hasData = Array.isArray(data) && data.length > 0;  // part 1
    if ( !hasData ) return;
    
    const geoJson = {
      type: 'FeatureCollection',
      // features: countries.map((country = {}) => {    // part 2
      features: data.map((country = {}) => {      // part 1
        const { countryInfo = {} } = country;
        const { lat, long: lng } = countryInfo;
        return {
          type: 'Feature',
          properties: {
            ...country,
          },
          geometry: {
            type: 'Point',
            coordinates: [ lng, lat ]
          }
        }
      })
    }

    const geoJsonLayers = new L.GeoJSON(geoJson, {
      pointToLayer: (feature = {}, latlng) => {
        const { properties = {} } = feature;
        let updatedFormatted;
        let casesString;
    
        const {
          country,
          updated,
          cases,
          deaths,
          recovered
        } = properties
    
        casesString = `${cases}`;
    
        if ( cases > 1000 ) {
          casesString = `${casesString.slice(0, -3)}k+`
        }
    
        if ( updated ) {
          updatedFormatted = new Date(updated).toLocaleString();
        }
    
        const html = `
          <span class="icon-marker">
            <span class="icon-marker-tooltip">
              <h2>${country}</h2>
              <ul>
                <li><strong>Confirmed:</strong> ${cases}</li>
                <li><strong>Deaths:</strong> ${deaths}</li>
                <li><strong>Recovered:</strong> ${recovered}</li>
                <li><strong>Last Update:</strong> ${updatedFormatted}</li>
              </ul>
            </span>
            ${ casesString }
          </span>
        `;
      
        return L.marker( latlng, {
          icon: L.divIcon({
            className: 'icon',
            html
          }),
          riseOnHover: true
        });
      }
    });
    console.log('@WILL -- about to complete geoJson');
    console.log(geoJson);

    geoJsonLayers.addTo(map);
  };

  const mapSettings = {
    center: CENTER,
    defaultBaseMap: "OpenStreetMap",
    zoom: DEFAULT_ZOOM,
    whenCreated: mapEffect,
  };




  /***********************
   * BEGIN CODE FOR TABLE*
   ***********************/



   const [data, setData] = useState([]);

   useEffect(() => {
     (async () => {
       const result = await axios('https://corona.lmao.ninja/v2/countries');
       setData(result.data);
     })();
   }, []);



   const columns = useMemo(
    () => [
      {
        Header: "Country",
        columns: [
          {
            accessor: "countryInfo.flag",
            Cell: ({ cell: { value }}) => (
              <div className="country_flag">
                <img
                  src={value} alt={value} width={"15%"} height={"auto"}
                />
              </div>
            )
          },
          {
            Header: "Name",
            accessor: "country"
          },
          {
            Header: "Code",
            accessor: "countryInfo.iso3",


          }
        ]
      },
      {
        Header: "Details",

        columns: [
          {
            Header: "Cases",
            accessor: "cases"
          },
          {
            Header: "Deaths",
            accessor: "deaths"
          },
          {
            Header: "Recovered",
            accessor: "recovered"
          },
          {
            Header: "Cases Per One Million",
            accessor: "casesPerOneMillion"
          },
          {
            Header: "Deaths Per One Million",
            accessor: "deathsPerOneMillion"
          }
        ]
      }
    ],
    []
  );



  function Table({ columns, data }) {
    const{
      getTableProps,
      getTableBodyProps,
      headerGroups,
      rows,
      prepareRow,
    } = useTable(
      {
          columns,
          data,
          initialState: { // Make the default state of the table sort by desc of global cases
              sortBy: [
                  {
                      id: "cases",
                      desc: true
                  }
              ]
          }
      },
      useSortBy,
  );
    return (
      <table {...getTableProps()}>
          
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}
                className={
                    column.isSorted
                      ? column.isSortedDesc
                          ? "sort-desc"
                          : "sort-asc"
                      : ""
                }
                >{column.render("Header")}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return <td {...cell.getCellProps()}>{cell.render("Cell")}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );

  }




  /***********************
   * END CODE FOR TABLE  *
   ***********************/

  return (
    <Layout pageName="home">
      <Helmet>
        <title>Home Page</title>
      </Helmet>

    <div className="tracker">
      <Map {...mapSettings} />
      <div className="tracker-stats">
        <ul>
          { dashboardStats.map(({ primary = {}, secondary = {} }, i ) => {
            return (
              <li key={`Stat-${i}`} className="tracker-stat">
              { primary.value && (
                <p className="tracker-stat-primary">
                  { primary.value }
                  <strong> { primary.label } </strong>
                </p>
              ) }
              { secondary.value && (
                <p className="tracker-stat-secondary">
                  { secondary.value } 
                  <strong> { secondary.label } </strong>
                </p>
              ) }
            </li>   
          );  
        }) }
      </ul>        
    </div>             
  </div> 
  <div className="tracker-last-updated">
    <p>Last Updated: { stats ? friendlyDate( stats?.updated ) : '-' } </p>
  </div>

  <Container type="content" className="text-center home-start"> 
        <Table columns={columns} data={data}/>
    </Container>
  </Layout>
  );
};

export default IndexPage;
