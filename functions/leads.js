// Netlify serverless function to proxy Google Sheets API for leads
// Deployed at: https://nti-clawdbot.netlify.app/.netlify/functions/leads

const GOOGLE_SHEET_ID = '1TY76_jQl2KRuIk-CIUyYd2wzxaMB3w1ki0rpgXP3FyA';

// Hardcoded sample data fallback
const SAMPLE_LEADS = [
    { company: 'Hemma Hemma Dinette', contact: 'Ashley Bare', email: '', phone: '', territory: 'Dan (KC)', industry: 'Diner/Casual', heat: 'Hot', stage: 'Prospect', owner: 'Dan', nextSteps: 'Contact Ashley' },
    { company: 'Sandlot Social', contact: 'Sandlot Social', email: '', phone: '', territory: 'Dan (KC)', industry: 'Eatertainment', heat: 'Warm', stage: 'Prospect', owner: 'Dan', nextSteps: 'Research decision-makers' },
    { company: 'Zingaro', contact: 'Fabio Viviani', email: '', phone: '', territory: 'Joe (Large Cincinnati)', industry: 'Italian', heat: 'Hot', stage: 'Prospect', owner: 'Joe', nextSteps: 'CEO outreach' },
    { company: 'Wings Bar and Grill', contact: 'Haydar & Michael', email: '', phone: '', territory: 'Austin (Cincinnati)', industry: 'Sports Bar', heat: 'Warm', stage: 'Prospect', owner: 'Austin', nextSteps: 'Schedule call' },
    { company: 'Italian Sausage Co.', contact: 'Joe Brancato', email: '', phone: '', territory: 'Dan (KC)', industry: 'Italian QSR', heat: 'Hot', stage: 'Prospect', owner: 'Dan', nextSteps: 'Follow up' },
    { company: 'Dear Donna', contact: 'Johnny & Helen Jo Leach', email: '', phone: '', territory: 'Dan (KC)', industry: 'Restaurant/Bakery', heat: 'Hot', stage: 'Prospect', owner: 'Dan', nextSteps: 'Site visit' },
    { company: 'Casa (Alfred & Co.)', contact: 'Robin Krause', email: '', phone: '', territory: 'Dan (KC)', industry: 'Mexican', heat: 'Hot', stage: 'Prospect', owner: 'Dan', nextSteps: 'Email intro' },
    { company: 'CAVA (Oakley)', contact: 'Dimitri Moshovitis', email: '', phone: '', territory: 'Austin (Cincinnati)', industry: 'Mediterranean QSR', heat: 'Warm', stage: 'Prospect', owner: 'Austin', nextSteps: 'Research expansion' },
    { company: 'Whiskey Yard', contact: 'Epic Brands', email: '', phone: '', territory: 'Joe (Large Cincinnati)', industry: 'Whiskey Bar', heat: 'Hot', stage: 'Prospect', owner: 'Joe', nextSteps: 'Follow up' },
    { company: 'VV Italian Experience', contact: 'Andrea Stefano', email: '', phone: '', territory: 'Austin (Cincinnati)', industry: 'Italian Café', heat: 'Warm', stage: 'Prospect', owner: 'Austin', nextSteps: 'Check expansion plans' },
    // Today's new leads
    { company: 'TQL Stadium District', contact: '', email: '', phone: '', territory: 'Austin (Cincinnati)', industry: 'Mixed-Use Development', heat: 'Hot', stage: 'Prospect', owner: 'Austin', nextSteps: 'Contact developer' },
    { company: 'Factory 52 Norwood', contact: '', email: '', phone: '', territory: 'Austin (Cincinnati)', industry: 'Lifestyle Destination', heat: 'Warm', stage: 'Prospect', owner: 'Austin', nextSteps: 'Research tenants' },
    { company: 'The Foundry Cincinnati', contact: '', email: '', phone: '', territory: 'Austin (Cincinnati)', industry: 'Retail/Restaurant', heat: 'Warm', stage: 'Prospect', owner: 'Austin', nextSteps: 'Research manager' },
    { company: 'Mission Beverly', contact: '', email: '', phone: '', territory: 'Dan (KC)', industry: 'Mixed-Use Development', heat: 'Warm', stage: 'Prospect', owner: 'Dan', nextSteps: 'Contact developer' },
    { company: 'The Lanes at Mission Bowl Phase II', contact: '', email: '', phone: '', territory: 'Dan (KC)', industry: 'Mixed-Use', heat: 'Warm', stage: 'Prospect', owner: 'Dan', nextSteps: 'Research phase 2' }
];

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  // Handle GET (fetch leads)
  try {
    // For now, return sample data + today's new leads
    // In future, this could fetch from Google Sheet with server-side auth
    
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
        count: SAMPLE_LEADS.length,
        leads: SAMPLE_LEADS,
        source: 'hardcoded-sample-data'
      })
    };
  } catch (error) {
    console.error('Leads fetch error:', error);
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
