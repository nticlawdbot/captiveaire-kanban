// Netlify Function: Fetch leads from Smartsheet
// Cache bust: 2026-03-11 12:48 - Force function cache refresh for new leads
const https = require('https');

const SMARTSHEET_API_TOKEN = process.env.SMARTSHEET_API_TOKEN || '6Q82Fjy1NKLHhEufhHshTSi5gje1EfmtgXK0D';
const LEADS_SHEET_ID = process.env.LEADS_SHEET_ID || '8116430953205636';

exports.handler = async (event, context) => {
  // Handle POST (add new lead to Smartsheet)
  if (event.httpMethod === 'POST') {
    try {
      const leadData = JSON.parse(event.body);
      console.log('📝 Received leadData:', JSON.stringify(leadData));
      
      // Column ID mappings for CaptiveAire Leads Pipeline Smartsheet (8116430953205636)
      const COLUMN_MAP = {
        "Company Name": 70811661324164,
        "Primary Contact": 4574411288694660,
        "Contact Email": 2322611475009412,
        "Contact Phone": 6826211102379908,
        "Territory": 1196711568166788,
        "Industry/Type": 5700311195537284,
        "Heat Level": 3448511381852036,
        "Stage": 7952111009222532,
        "Next Steps": 5137361242115972,
        "Owner": 633761614745476
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

          // Transform rows into lead objects
          const leads = sheetData.rows.map(row => {
            const lead = {};
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
