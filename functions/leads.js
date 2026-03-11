// Netlify Function: Fetch leads from Smartsheet
// Cache bust: 2026-03-11 12:48 - Force function cache refresh for new leads
const https = require('https');

const SMARTSHEET_API_TOKEN = process.env.SMARTSHEET_API_TOKEN || '6Q82Fjy1NKLHhEufhHshTSi5gje1EfmtgXK0D';
const LEADS_SHEET_ID = process.env.LEADS_SHEET_ID || '8116430953205636';

exports.handler = async (event, context) => {
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
