// Netlify serverless function to proxy Smartsheet API (no CORS issues!)
// Deployed at: https://your-site.netlify.app/.netlify/functions/projects

const SMARTSHEET_ID = '6669466080700292';
const SMARTSHEET_TOKEN = '37CqtoRa11MAwh01gxAy20DKR0vrz2cZQZlgE';

// Smartsheet column IDs
const COLS = {
  Company: 8377424631097220,
  Location: 1059075236620164,
  'Job Number': 5562674863990660,
  Status: 7474414543130500,
  'Turnover Date': 3117391865505668,
  Owner: 3530585123645316
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
      const response = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_ID}/rows`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SMARTSHEET_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rows: [{
              toBottom: true,
              cells: [
                { columnId: COLS.Company, value: company },
                { columnId: COLS.Location, value: location },
                { columnId: COLS['Job Number'], value: job },
                { columnId: COLS.Status, value: status || 'Backlog' },
                { columnId: COLS.Owner, value: owner || '' }
              ]
            }]
          })
        }
      );

      if (!response.ok) {
        return {
          statusCode: response.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Smartsheet API error' })
        };
      }

      return {
        statusCode: 201,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Project created' })
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
      let company, location, job, status, owner;

      row.cells.forEach(cell => {
        if (cell.columnId === COLS.Company) company = cell.value;
        if (cell.columnId === COLS.Location) location = cell.value;
        if (cell.columnId === COLS['Job Number']) job = cell.value;
        if (cell.columnId === COLS.Status) status = cell.value;
        if (cell.columnId === COLS.Owner) owner = cell.value;
      });

      // Only include rows with job numbers
      if (company && job) {
        projects.push({
          id: `ss-${row.id}`,
          company: String(company),
          location: String(location || 'Unknown'),
          job: String(Math.floor(job)),
          status: String(status || 'Backlog'),
          owner: owner ? String(owner) : null
        });
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
