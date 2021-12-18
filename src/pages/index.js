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

//imports for line chart
import ReactApexChart from "react-apexcharts";
import ApexCharts from "apexcharts";

// import for pie chart
import { PieChart } from 'react-minimal-pie-chart';


//react tabs
import 'react-tabs/style/react-tabs.css';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

//material-ui styling imports
import MaUTable from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import CssBaseline from '@material-ui/core/CssBaseline';

var pieData = [];
var hasPopulatedPieData = false;
let response;




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
        /* PIE CHART CODE */
        if(!hasPopulatedPieData) {
          //if(pieData.length === 0) {
            for(let j=0; j < geoJson.features.length; j++) {
              if(geoJson.features[j].properties.cases > 5000000) {
                //console.log(geoJson.features[j]);
                pieData.push({ title: geoJson.features[j].properties.country, value: geoJson.features[j].properties.cases, color: '#'+Math.floor(Math.random()*16777215).toString(16) });
              }
            }
            console.log(geoJson);
            hasPopulatedPieData = true;
          }
        /* END PIE CHART CODE */
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


  /* FUNCTION FOR RETREIVING ENDPOINT FOR GLOBAL COVID DATA */
   const [global_data, setGlobalData] = useState([]);

   useEffect(() => {
     (async () => {
       const result = await axios('https://corona.lmao.ninja/v2/countries');
       setGlobalData(result.data);
     })();
   }, []);


  /* FUNCTION FOR RETREIVING ENDPOINT FOR UNITED STATES COVID DATA */
   const [state_data, setStateData] = useState([]);

   useEffect(() => {
     (async () => {
       const result = await axios('https://corona.lmao.ninja/v2/states');
       setStateData(result.data);
     })();
   }, []);


   /*********************************************************************** 
   * Define the columns we want from the API for all the world wide stats *
   ************************************************************************/
   const global_columns = useMemo(
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



   /*********************************************************************** 
   * Define the columns we want from the API for all the US STATES stats *
   ************************************************************************/
    const state_columns = useMemo(
      () => [
        {
          Header: "State",
          columns: [
            {
              Header: "Name",
              accessor: "state"
            },
            {
              Header: "Population",
              accessor: "population"

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
            },
            {
              Header: "Tests",
              accessor: "tests"
            },
            {
              Header: "Tests Per One Million",
              accessor: "testsPerOneMillion"
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
    return(
      <MaUTable {...getTableProps()}>
        <TableHead>
          {headerGroups.map(headerGroup => (
            <TableRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <TableCell {...column.getHeaderProps(column.getSortByToggleProps())}
                  className={
                    column.isSorted
                      ? column.isSortedDesc
                        ? "sort-desc"
                        : "sort-asc"
                      : ""
                  }>
                  {column.render('Header')}                    
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {rows.map((row, i) => {
            prepareRow(row)
            return (
              <TableRow {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return (
                    <TableCell {...cell.getCellProps()}>
                      {cell.render('Cell')}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </MaUTable>
    );

  }




  /***********************
   * END CODE FOR TABLE  *
   ***********************/



  /******************************
   * BEGIN CODE FOR LINE GRAPH  *
   ******************************/


  
   async function obtainData() {
    const response = await axios.get(
        "https://corona.lmao.ninja/v3/covid-19/historical/all?lastdays=all"
    );
    return response.data;
}

function GlobalTrendGraphFunction(){

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      (async () => {
        try {
          // set loading to true before calling API
          setLoading(true);
          const data = await obtainData();
          console.log(data);
          console.log("HELLO MOM I MADE IT");
          setData(data);
          // switch loading to false after fetch is complete
          setLoading(false);
        } catch (error) {
          // add error handling here
          setLoading(false);
          console.log(error);
        }
      })();
    }, []);

        let series = [
      {
          name: "Global Cases",
          // amount of cases
          data: [],
      },
  ];

  console.log(series);
  let options = {
      chart: {
          height: 350,
          type: "line",
          zoom: {
              enabled: true,
          },
      },
      dataLabels: {
          enabled: false,
      },
      stroke: {
          curve: "straight",
      },
      title: {
          text: "Global COVID Trend Since Epoch",
          align: "left",
      },
      grid: {
          row: {
              colors: ["#f3f3f3", "transparent"], // takes an array which will be repeated on columns
              opacity: 0.5,
          },
      },
      xaxis: {
          // dates
          categories: [],
      },
  };



    // return a Spinner when loading is true
    if (loading) return <span>Loading</span>;

    // data will be null when fetch call fails
    if (!data) return <span>Data not available</span>;

    [series[0].data, options.xaxis.categories] = Object.entries(data.cases);

    return (
        <div id="chart">
            <ReactApexChart
                options={options}
                series={series}
                type="line"
                height={350}
            />
        </div>
    );
};





  /****************************
   * END CODE FOR LINE GRAPH  *
   ****************************/
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
      <Tabs>
        <TabList>
          <Tab>Global Table</Tab>
          <Tab>US Table</Tab>
          <Tab>Global Pie Chart</Tab>
          <Tab>Global Time Series</Tab> 
        </TabList>

        <TabPanel>
          <Table columns={global_columns} data={global_data}/>
        </TabPanel>

        <TabPanel>
          <Table columns={state_columns} data={state_data}/>
        </TabPanel>

        <TabPanel>
          <div>
            <PieChart
                  label={(props) => { return props.dataEntry.title;}}
                  data={pieData}
                  animate
                  animationDuration={500}
                  animationEasing="ease-out"
                  center={[50, 50]}
                  lengthAngle={360}
                  lineWidth={65}
                  paddingAngle={0}
                  radius={50}
                  startAngle={0}
                  viewBoxSize={[100, 100]}
                  label={(data) => data.dataEntry.title}
                  labelPosition={50}
                  labelStyle={{
                    fontSize: "5px",
                    fontColor: "FFFFFA",
                    fontWeight: "10",
                  }}
                     />
                        <style jsx>{`
        .chart-container {
          height: 200px;
          margin-left: auto;
          margin-right: auto;
          width: 200px;
        }

        .inline-container {
          align-items: center;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          width: 100%;
        }

        table {
          margin-left: auto;
          margin-right: auto;
          margin-top: 3em;
          table-layout: fixed;
          width: 90%;
        }
        table tr th {
          text-align: left;
          background: gray;
          color: white;
        }
      `}</style>
                  </div>
        
        </TabPanel>
        <TabPanel>
          <GlobalTrendGraphFunction/>
        </TabPanel>
      </Tabs>
    </Container>
  </Layout>
  );
};

export default IndexPage;
