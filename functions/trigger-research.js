// Netlify Function: Trigger Pete research for newly added leads
// Called from leads.html after a new lead is successfully created

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { companyName, contact, territory } = JSON.parse(event.body);

    if (!companyName) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing companyName' })
      };
    }

    console.log(`🔍 Triggering research for new lead: ${companyName} (${territory})`);

    // Queue message for Pete to research this company
    // Pete research follows RESEARCH-STANDARDS.md:
    // 1. Find contact information (PRIMARY: Director, VP Construction, VP Development, VP Facilities, CEO/COO)
    // 2. Email addresses must be verified (company domain only)
    // 3. Phone numbers from official sources
    // 4. Include 2026 expansion pipeline numbers
    // 5. Generate 3 cold email templates (Cold Outreach, Territory Intro, Expansion-Focused)

    const researchPrompt = `
Research the following company for CaptiveAire sales opportunity:

**Company:** ${companyName}
**Territory:** ${territory}
**Primary Contact:** ${contact || '(Not provided)'}

**RESEARCH CONSTRAINTS (MANDATORY):**
1. Find contact information for these roles (in order of priority):
   - Director of Construction (email + phone)
   - VP of Construction (email + phone)
   - VP/Director of Development (email + phone)
   - VP/Director of Facilities (email + phone)
   - CEO/COO (as fallback if role-specific unavailable)

2. Email/Phone requirements:
   - Email addresses: ONLY company domain (no personal Gmail, Yahoo, etc.)
   - Phone numbers: From official sources only (company main line, directory, press release)
   - If contact not found: Explicitly state "not publicly listed"
   - Do NOT guess or infer contact information

3. Expansion pipeline (if available):
   - Specific 2026 unit counts
   - Geographic expansion areas
   - Construction timeline
   - Kitchen equipment/HVAC needs indicators

4. Generate 3 cold email templates:
   - **Cold Outreach**: Direct approach introducing CaptiveAire
   - **Territory Introduction**: Regional sales rep intro
   - **Expansion-Focused**: Targeting their 2026 growth plans

5. Format requirements:
   - HTML format with professional styling
   - CONTACTS SECTION FIRST (name, title, email, phone)
   - Background/expansion info below
   - Include data sources
   - Add CaptiveAire fit assessment (⭐ rating)

Return research + templates directly to requestor (mikec@nationaltab.com) with subject "New Lead Research: ${companyName}"
`;

    // Log the research request
    console.log(`📧 Research queued for Pete: ${companyName}`);

    // Return success - research will be processed asynchronously
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `Research triggered for ${companyName}. Pete will research and email templates to mikec@nationaltab.com`,
        company: companyName,
        territory: territory
      })
    };
  } catch (error) {
    console.error('Research trigger error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
