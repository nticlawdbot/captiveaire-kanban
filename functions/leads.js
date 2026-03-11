// Netlify Function: Fetch leads from Smartsheet
// Cache bust: 2026-03-11 12:48 - Force function cache refresh for new leads
const https = require('https');

const https = require('https');

const SMARTSHEET_API_TOKEN = process.env.SMARTSHEET_API_TOKEN || '6Q82Fjy1NKLHhEufhHshTSi5gje1EfmtgXK0D';
const LEADS_SHEET_ID = process.env.LEADS_SHEET_ID || '8116430953205636';

exports.handler = async (event, context) => {
  // Handle DELETE (delete lead from Smartsheet)
  if (event.httpMethod === 'DELETE') {
    try {
      const data = JSON.parse(event.body);
      const rowId = data.rowId;

      if (!rowId) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing rowId' })
        };
      }

      console.log(`🗑️ Deleting row ${rowId} from Smartsheet`);

      const deleteResponse = await fetch(`https://api.smartsheet.com/2.0/sheets/${LEADS_SHEET_ID}/rows/${rowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SMARTSHEET_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!deleteResponse.ok) {
        const error = await deleteResponse.text();
        console.error('Smartsheet delete error:', deleteResponse.status, error);
        return {
          statusCode: deleteResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Smartsheet API error: ${deleteResponse.status}` })
        };
      }

      console.log('✅ Row deleted from Smartsheet');

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Lead deleted successfully', rowId: rowId })
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

  // Handle PATCH (update existing lead in Smartsheet)
  if (event.httpMethod === 'PATCH') {
    try {
      const updateData = JSON.parse(event.body);
      const rowId = updateData.rowId;
      const updates = updateData.updates; // e.g., { 'Stage': 'Qualified', 'Heat Level': 'Hot' }
      
      if (!rowId) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing rowId' })
        };
      }

      // Column ID mappings (from Smartsheet - verified 2026-03-11)
      // Updated: Owner is now PICKLIST type (was CONTACT_LIST) - can be set via API
      const COLUMN_MAP = {
        "Company Name": 70811661324164,
        "Primary Contact": 4574411288694660,
        "Contact Email": 2322611475009412,
        "Contact Phone": 6826211102379908,
        "Territory": 1196711568166788,
        "Industry/Type": 5700311195537284,
        "Heat Level": 3448511381852036,
        "Stage": 7952111009222532,
        "Owner": 633761614745476,
        "Next Steps": 5137361242115972
        // SKIP: "Notes" - column does not exist in Smartsheet (local-only)
      };

      // Build cells array from updates
      const cells = [];
      for (const [fieldName, value] of Object.entries(updates)) {
        if (COLUMN_MAP[fieldName]) {
          cells.push({
            columnId: COLUMN_MAP[fieldName],
            value: String(value || '')
          });
        }
      }

      if (cells.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No valid fields to update' })
        };
      }

      console.log(`🔄 Updating row ${rowId} with:`, JSON.stringify(cells));
      console.log(`📝 Request body:`, JSON.stringify({ cells: cells }));

      // Update the row in Smartsheet
      const response = await fetch(`https://api.smartsheet.com/2.0/sheets/${LEADS_SHEET_ID}/rows/${rowId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SMARTSHEET_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cells: cells })
      });

      const responseText = await response.text();
      console.log(`📊 Smartsheet response status: ${response.status}`);
      console.log(`📊 Smartsheet response body:`, responseText);

      if (!response.ok) {
        console.error('❌ Smartsheet update failed:', response.status, responseText);
        return {
          statusCode: response.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Smartsheet API error: ${response.status}`, details: responseText })
        };
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to parse Smartsheet response' })
        };
      }

      console.log('✅ Row updated:', data);

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Lead updated successfully', data: data })
      };
    } catch (error) {
      console.error('PATCH error:', error);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  // Handle POST (add new lead to Smartsheet)
  if (event.httpMethod === 'POST') {
    try {
      const leadData = JSON.parse(event.body);
      console.log('📝 Received leadData:', JSON.stringify(leadData));
      
      // Column ID mappings for CaptiveAire Leads Pipeline Smartsheet (8116430953205636)
      // Verified 2026-03-11: Owner changed from CONTACT_LIST to PICKLIST - now syncable via API
      const COLUMN_MAP = {
        "Company Name": 70811661324164,
        "Primary Contact": 4574411288694660,
        "Contact Email": 2322611475009412,
        "Contact Phone": 6826211102379908,
        "Territory": 1196711568166788,
        "Industry/Type": 5700311195537284,
        "Heat Level": 3448511381852036,
        "Stage": 7952111009222532,
        "Owner": 633761614745476,
        "Next Steps": 5137361242115972
      };
      
      const cells = [];
      for (const [fieldName, value] of Object.entries(leadData)) {
        if (COLUMN_MAP[fieldName]) {
          cells.push({
            columnId: COLUMN_MAP[fieldName],
            value: String(value || '')
          });
        }
      }
      console.log('📍 Built cells:', JSON.stringify(cells));
      
      const payload = {
        rows: [{
          toBottom: true,
          cells: cells
        }]
      };
      
      // First, create the empty row
      const createResponse = await fetch(`https://api.smartsheet.com/2.0/sheets/${LEADS_SHEET_ID}/rows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SMARTSHEET_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rows: [{ toBottom: true }] })
      });
      
      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error('Smartsheet create error:', createResponse.status, error);
        return {
          statusCode: createResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Smartsheet API error: ${createResponse.status}` })
        };
      }
      
      const createData = await createResponse.json();
      const newRowId = createData.result.id;
      console.log('✅ Row created:', newRowId);
      
      // Now update the row with the actual values
      const updateResponse = await fetch(`https://api.smartsheet.com/2.0/sheets/${LEADS_SHEET_ID}/rows/${newRowId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SMARTSHEET_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cells: cells })
      });
      
      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        console.error('Smartsheet update error:', updateResponse.status, JSON.stringify(error));
        return {
          statusCode: updateResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Smartsheet update failed: ${updateResponse.status}`, details: error })
        };
      }
      
      const updateData = await updateResponse.json();
      console.log('✅ Lead values saved to Smartsheet:', updateData);
      
      return {
        statusCode: 201,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Lead added successfully', data: updateData })
      };
    } catch (error) {
      console.error('POST error:', error);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  // Handle GET (fetch leads from Smartsheet)
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.smartsheet.com',
      path: `/2.0/sheets/${LEADS_SHEET_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SMARTSHEET_API_TOKEN}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve({
              statusCode: res.statusCode,
              body: JSON.stringify({ error: `Smartsheet API returned ${res.statusCode}` }),
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
            return;
          }

          const sheetData = JSON.parse(data);

          // Transform rows into lead objects, including row ID for updates
          const leads = sheetData.rows.map(row => {
            const lead = { _rowId: row.id }; // Store the Smartsheet row ID
            row.cells.forEach(cell => {
              const col = sheetData.columns.find(c => c.id === cell.columnId);
              if (col) {
                lead[col.title] = cell.displayValue || cell.value || '';
              }
            });
            return lead;
          });

          resolve({
            statusCode: 200,
            body: JSON.stringify(leads),
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } catch (error) {
          console.error('Parse error:', error.message);
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to parse response' }),
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    });

    req.end();
  });
};
