// Netlify serverless function to proxy Smartsheet API (no CORS issues!)
// Deployed at: https://your-site.netlify.app/.netlify/functions/projects

const SMARTSHEET_ID = '6669466080700292';
const SMARTSHEET_TOKEN = '37CqtoRa11MAwh01gxAy20DKR0vrz2cZQZlgE';

// Smartsheet column IDs
const COLS = {
  Company: 8377424631097220,
  Location: 1059075236620164,
  'Job Number': 5562674863990660,
  'NTi Hood Install': 1821797590454148,
  'NTi TAB': 7085205822852996,
  Status: 7474414543130500,
  'Turnover Date': 3117391865505668,
  'Fire Final': 3360332395636612,
  'SDV': 5519380670533508,
  'TAB': 4157645235480452,
  'Hood Ship Date': 8197477746036612,
  'Site Contact': 669709439920004,
  'Site Contact #': 5173309067290500,
  'Site Contact Email': 2921509253605252,
  'Fire System Service': 8557701821058948,
  'FS #': 8449242890981252,
  'Coordinator': 6938750875291524
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  // Handle POST (add/update project)
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      const { company, location, job, status, owner } = data;

      if (!company || !job) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing company or job' })
        };
      }

      // Create row in Smartsheet
      const payload = {
        rows: [{
          toBottom: true,
          cells: [
            { columnId: COLS.Company, value: company },
            { columnId: COLS.Location, value: location },
            { columnId: COLS['Job Number'], value: job },
            { columnId: COLS.Status, value: status || 'Backlog' },
            { columnId: COLS.Coordinator, value: owner || '' }
          ]
        }]
      };

      console.log('POST Payload:', JSON.stringify(payload));

      const response = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_ID}/rows`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SMARTSHEET_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const responseData = await response.json();
      console.log('Smartsheet Response:', responseData);

      if (!response.ok) {
        return {
          statusCode: response.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Smartsheet API error', details: responseData })
        };
      }

      return {
        statusCode: 201,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Project created', data: responseData })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  try {
    // Call Smartsheet API (server-side, no CORS issues!)
    const response = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SMARTSHEET_TOKEN}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: `Smartsheet API error: ${response.status}` })
      };
    }

    const data = await response.json();
    const projects = [];

    // Parse rows and extract project data
    data.rows.forEach(row => {
      const project = { id: `ss-${row.id}` };

      row.cells.forEach(cell => {
        if (cell.columnId === COLS.Company) project.company = String(cell.value || '');
        if (cell.columnId === COLS.Location) project.location = String(cell.value || 'Unknown');
        if (cell.columnId === COLS['Job Number']) project.job = String(Math.floor(cell.value || 0));
        if (cell.columnId === COLS.Status) project.status = String(cell.value || 'Backlog');
        if (cell.columnId === COLS.Coordinator) project.owner = cell.value ? String(cell.value) : null;
        if (cell.columnId === COLS['Turnover Date']) project.turnoverDate = cell.value ? String(cell.value).split('T')[0] : null;
        if (cell.columnId === COLS['Fire Final']) project.fireFinal = cell.value === true;
        if (cell.columnId === COLS['SDV']) project.sdv = cell.value === true;
        if (cell.columnId === COLS['Fire System Service']) project.fireSystemService = cell.value === true;
        if (cell.columnId === COLS['Hood Ship Date']) project.hoodShipDate = cell.value ? String(cell.value).split('T')[0] : null;
        if (cell.columnId === COLS['Site Contact']) project.siteContact = cell.value ? String(cell.value) : null;
        if (cell.columnId === COLS['Site Contact #']) project.siteContactPhone = cell.value ? String(cell.value) : null;
        if (cell.columnId === COLS['Site Contact Email']) project.siteContactEmail = cell.value ? String(cell.value) : null;
        if (cell.columnId === COLS['FS #']) project.fsNumber = cell.value ? String(cell.value) : null;
      });

      // Only include rows with job numbers
      if (project.company && project.job) {
        projects.push(project);
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        count: projects.length,
        projects: projects
      })
    };
  } catch (error) {
    console.error('Smartsheet fetch error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
