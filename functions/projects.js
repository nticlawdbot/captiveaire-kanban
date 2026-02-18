// Netlify serverless function to proxy Smartsheet API (no CORS issues!)
// Deployed at: https://nti-clawdbot.netlify.app/.netlify/functions/projects

const SMARTSHEET_ID = '6669466080700292';
const SMARTSHEET_TOKEN = '6Q82Fjy1NKLHhEufhHshTSi5gje1EfmtgXK0D';

// Smartsheet column IDs (PRODUCTION SHEET 6669466080700292)
const COLS = {
  Company: 8377424631097220,
  Location: 1059075236620164,
  'Job Number': 5562674863990660,
  Status: 7474414543130500,
  'Turnover Date': 3117391865505668,
  'Fire Final': 3360332395636612,
  'SDV': 5519380670533508,
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  // Handle DELETE (archive/delete row from Smartsheet)
  if (event.httpMethod === 'DELETE') {
    try {
      const data = JSON.parse(event.body);
      let { rowId } = data;

      if (!rowId) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing rowId' })
        };
      }

      // CRITICAL: Strip 'ss-' prefix if present (client-side might not have done it)
      if (rowId.startsWith('ss-')) {
        console.log(`⚠️ Received rowId with 'ss-' prefix: ${rowId}, stripping...`);
        rowId = rowId.substring(3);
        console.log(`✅ Cleaned rowId: ${rowId}`);
      }

      // Delete the row from Smartsheet
      const deleteResponse = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_ID}/rows/${rowId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SMARTSHEET_TOKEN}`
          }
        }
      );

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        console.error('Smartsheet DELETE error:', error);
        return {
          statusCode: deleteResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to delete row', details: error })
        };
      }

      console.log(`✅ Row deleted from Smartsheet: ${rowId}`);

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Row deleted successfully', rowId })
      };
    } catch (error) {
      console.error('DELETE error:', error);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  // Handle PUT (update existing project in Smartsheet)
  if (event.httpMethod === 'PUT') {
    try {
      const data = JSON.parse(event.body);
      let { rowId, company, location, status, turnoverDate, siteContact, siteContactPhone, siteContactEmail, fireFinal, sdv, fireSystemService, hoodShipDate, fsNumber } = data;

      if (!rowId) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing rowId' })
        };
      }

      // CRITICAL: Strip 'ss-' prefix if present (client-side might not have done it)
      if (rowId.startsWith('ss-')) {
        console.log(`⚠️ Received rowId with 'ss-' prefix: ${rowId}, stripping...`);
        rowId = rowId.substring(3);
        console.log(`✅ Cleaned rowId: ${rowId}`);
      }

      // Build cells array with only fields that have values
      // CRITICAL: Skip false boolean values - Smartsheet doesn't like them
      const cells = [];
      if (company !== undefined && company !== null) cells.push({ columnId: COLS.Company, value: company });
      if (location !== undefined && location !== null) cells.push({ columnId: COLS.Location, value: location });
      if (status !== undefined && status !== null) cells.push({ columnId: COLS.Status, value: status });
      if (turnoverDate !== undefined && turnoverDate !== null) cells.push({ columnId: COLS['Turnover Date'], value: turnoverDate });
      if (siteContact !== undefined && siteContact !== null) cells.push({ columnId: COLS['Site Contact'], value: siteContact });
      if (siteContactPhone !== undefined && siteContactPhone !== null) cells.push({ columnId: COLS['Site Contact #'], value: siteContactPhone });
      if (siteContactEmail !== undefined && siteContactEmail !== null) cells.push({ columnId: COLS['Site Contact Email'], value: siteContactEmail });
      // Only send checkbox values if TRUE (Smartsheet hates false values)
      if (fireFinal === true) cells.push({ columnId: COLS['Fire Final'], value: true });
      if (sdv === true) cells.push({ columnId: COLS.SDV, value: true });
      if (fireSystemService === true) cells.push({ columnId: COLS['Fire System Service'], value: true });
      if (hoodShipDate !== undefined && hoodShipDate !== null) cells.push({ columnId: COLS['Hood Ship Date'], value: hoodShipDate });
      if (fsNumber !== undefined && fsNumber !== null) cells.push({ columnId: COLS['FS #'], value: fsNumber });

      const updatePayload = { cells };

      const updateResponse = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_ID}/rows/${rowId}`,
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
        console.error('Smartsheet PUT error:', updateData);
        return {
          statusCode: updateResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to update row', details: updateData })
        };
      }

      console.log(`✅ Project updated in Smartsheet: Row ${rowId}`);

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Project updated successfully', rowId })
      };
    } catch (error) {
      console.error('PUT error:', error);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
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
