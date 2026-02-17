// Netlify serverless function to proxy Smartsheet API (no CORS issues!)
// Deployed at: https://nti-clawdbot.netlify.app/.netlify/functions/projects

const SMARTSHEET_ID = '7612984097460100';
const SMARTSHEET_TOKEN = '42c3kEQjAtF8UPFFUH6ejjnMK1fwt0cbg49iR';

// Smartsheet column IDs (from cloned sheet 7612984097460100)
const COLS = {
  Company: 3940327155781508,
  Location: 8443926783152004,
  'Job Number': 1125577388674948,
  'NTi Hood Install': 5629177016045444,
  'NTi TAB': 3377377202360196,
  Status: 2251477295517572,
  'Turnover Date': 6755076922888068,
  'Fire Final': 4503277109202820,
  'SDV': 9006876736573316,
  'TAB': 502115553156,
  'Hood Ship Date': 4504101742923652,
  'Site Contact': 1126402022395780,
  'Site Contact #': 5630001649766276,
  'Site Contact Email': 3378201836081028,
  'Fire System Service': 7881801463451524,
  'FS #': 563452068974468,
  'Coordinator': 5137420440522628
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

  // Handle POST (add project with two-step API call: POST to create, PUT to populate)
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      const { company, location, job, status } = data;
      // Note: owner/assignee not used because Coordinator is a CONTACT type column in Smartsheet

      if (!company || !job) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing company or job' })
        };
      }

      // STEP 1: Create empty row
      const createPayload = {
        rows: [{
          toBottom: true,
          cells: []
        }]
      };

      const createResponse = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_ID}/rows`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SMARTSHEET_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createPayload)
        }
      );

      const createData = await createResponse.json();
      if (!createResponse.ok || !createData.result) {
        return {
          statusCode: createResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to create row', details: createData })
        };
      }

      const newRowId = createData.result.id;
      console.log(`Created row ${newRowId}, now populating with values...`);

      // STEP 2: Update the row with actual values (Smartsheet API quirk: only PUT works for cell values)
      const updatePayload = {
        cells: [
          { columnId: COLS.Company, value: company },
          { columnId: COLS.Location, value: location },
          { columnId: COLS['Job Number'], value: job },
          { columnId: COLS.Status, value: status || 'Backlog' }
        ]
      };

      // Note: Coordinator is a CONTACT column type, don't set it via API (causes validation error)
      // Users can set it manually in Smartsheet or we can handle it separately if needed

      const updateResponse = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_ID}/rows/${newRowId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${SMARTSHEET_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        }
      );

      const updateData = await updateResponse.json();
      if (!updateResponse.ok) {
        return {
          statusCode: updateResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to update row with values', details: updateData })
        };
      }

      console.log(`✅ Project created successfully: ${company} (Job ${job})`);

      return {
        statusCode: 201,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Project created successfully', rowId: newRowId })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  // Handle GET (fetch projects from Smartsheet)
  try {
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
