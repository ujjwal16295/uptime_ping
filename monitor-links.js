const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize email transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Function to ping a URL (API health check)
async function pingUrl(url, timeout = 30000) {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, {
      timeout,
      validateStatus: (status) => status >= 200 && status < 400, // Only 2xx and 3xx are successful
      headers: {
        'User-Agent': 'Link-Monitor/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    // Try to parse JSON response for health checks
    let responseData = null;
    try {
      if (typeof response.data === 'object') {
        responseData = response.data;
      } else if (typeof response.data === 'string') {
        responseData = JSON.parse(response.data);
      }
    } catch (parseError) {
      // Not JSON, that's okay for some health checks
      responseData = response.data;
    }
    
    return {
      success: true,
      status: response.status,
      responseTime,
      data: responseData,
      message: responseData?.message || responseData?.status || 'OK'
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Check if it's a response error (4xx, 5xx)
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        error: `HTTP ${error.response.status}: ${error.response.statusText}`,
        responseTime,
        code: error.code
      };
    }
    
    // Network or timeout error
    return {
      success: false,
      error: error.message,
      responseTime,
      code: error.code
    };
  }
}

// Function to send failure notification email
async function sendFailureEmail(email, failedLinks) {
  const failedLinksHtml = failedLinks
    .map(link => {
      const errorDetails = link.status 
        ? `HTTP ${link.status} - ${link.error}` 
        : link.error;
      const responseTime = link.responseTime 
        ? ` (Response time: ${link.responseTime}ms)` 
        : '';
      
      return `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
          <div style="font-weight: 600; color: #111827; margin-bottom: 8px; word-break: break-all;">
            ${link.url}
          </div>
          <div style="color: #dc2626; font-size: 14px; background: #fef2f2; padding: 8px 12px; border-radius: 8px; border: 1px solid #fecaca;">
            ${errorDetails}${responseTime}
          </div>
        </div>
      `;
    })
    .join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Health Check Alert</title>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #fef7ed 0%, #fef3c7 50%, #fef3c7 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <!-- Header -->
      <div style="background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px); border-bottom: 1px solid #e5e7eb; padding: 20px 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 0 16px;">
          <div style="display: flex; align-items: center; justify-content: center;">
            <div style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); padding: 12px; border-radius: 12px; margin-right: 12px;">
              <div style="width: 24px; height: 24px; background: white; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ea580c; font-weight: bold; font-size: 14px;">N</span>
              </div>
            </div>
            <h1 style="font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
              NapStopper
            </h1>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
        <div style="background: white; border-radius: 24px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #f3f4f6;">
          <!-- Alert Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="background: #fef2f2; padding: 12px; border-radius: 16px; width: 64px; height: 64px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px;">🚨</span>
            </div>
            <h2 style="font-size: 32px; font-weight: bold; color: #111827; margin: 0 0 8px 0;">API Health Alert</h2>
            <p style="color: #6b7280; font-size: 16px; margin: 0;">
              ${failedLinks.length} endpoint${failedLinks.length > 1 ? 's have' : ' has'} failed their health check${failedLinks.length > 1 ? 's' : ''}
            </p>
          </div>

          <!-- Failed Links -->
          <div style="margin-bottom: 32px;">
            <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Failed Endpoints:</h3>
            ${failedLinksHtml}
          </div>

          <!-- Info Box -->
          <div style="background: linear-gradient(135deg, #fef7ed 0%, #fef3c7 100%); padding: 20px; border-radius: 16px; border: 1px solid #fed7aa; margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 600; color: #92400e; margin: 0 0 12px 0;">Error Types Explained:</h3>
            <div style="space-y: 8px;">
              <div style="margin-bottom: 8px;">
                <strong style="color: #92400e;">HTTP 4xx errors:</strong> 
                <span style="color: #451a03;">Client-side issues (URL not found, authentication, etc.)</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #92400e;">HTTP 5xx errors:</strong> 
                <span style="color: #451a03;">Server-side issues (API down, internal errors)</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #92400e;">Timeout errors:</strong> 
                <span style="color: #451a03;">API took too long to respond (>30 seconds)</span>
              </div>
              <div>
                <strong style="color: #92400e;">Network errors:</strong> 
                <span style="color: #451a03;">Unable to reach the API endpoint</span>
              </div>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); border-radius: 12px; padding: 16px 32px; display: inline-block;">
              <span style="color: white; font-weight: 600; font-size: 16px;">Please check your API endpoints</span>
            </div>
          </div>

          <!-- Footer Message -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Best regards,<br>
              <strong>NapStopper Monitoring Service</strong>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Monitoring performed at ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer style="background: #111827; color: white; padding: 32px 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 0 16px; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <div style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); padding: 6px; border-radius: 8px; margin-right: 12px;">
              <div style="width: 24px; height: 24px; background: white; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ea580c; font-weight: bold; font-size: 14px;">N</span>
              </div>
            </div>
            <h3 style="font-size: 18px; font-weight: bold; margin: 0;">NapStopper</h3>
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">
            Keep your free-tier applications running 24/7 without any hassle.
          </p>
        </div>
      </footer>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: `🚨 NapStopper Alert - ${failedLinks.length} Endpoint${failedLinks.length > 1 ? 's' : ''} Failed`,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Failure notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    return false;
  }
}

// Function to update user stats (ping count and credit) - ONLY for successful pings
async function updateUserStats(email, successfulPingCount, creditDeduction) {
  try {
    // Only update if there were successful pings
    if (successfulPingCount === 0) {
      console.log(`No successful pings for ${email}, skipping stats update`);
      return true;
    }

    // First get current user data
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('ping, credit')
      .eq('email', email)
      .single();

    if (fetchError) {
      console.error(`Error fetching user ${email}:`, fetchError);
      return false;
    }

    // Calculate new values
    const newPing = existingUser.ping + successfulPingCount;
    const newCredit = Math.max(0, existingUser.credit - creditDeduction);

    // Update user's ping count and credit
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        ping: newPing,
        credit: newCredit 
      })
      .eq('email', email);

    if (updateError) {
      console.error(`Error updating user ${email}:`, updateError);
      return false;
    }

    console.log(`Updated ${email}: ping=${newPing}, credit=${newCredit} (${successfulPingCount} successful pings)`);
    return true;
  } catch (error) {
    console.error(`Error updating user stats for ${email}:`, error);
    return false;
  }
}

// Main function to monitor all links
async function monitorAllLinks() {
  console.log('Starting link monitoring...', new Date().toISOString());

  try {
    // Fetch all users with their links
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('email, links, credit')
      .gt('credit', 0); // Only process users with credit > 0

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
    }

    console.log(`Found ${users.length} users with credit to process`);

    // Process each user
    for (const user of users) {
      const { email, links, credit } = user;
      
      // Skip users with no links
      if (!links || links.length === 0) {
        console.log(`Skipping ${email}: no links to monitor`);
        continue;
      }

      // Skip users with insufficient credit for at least one successful ping
      if (credit < 10) {
        console.log(`Skipping ${email}: insufficient credit (has ${credit}, needs at least 10 per successful ping)`);
        continue;
      }

      console.log(`Processing ${email}: ${links.length} links`);
      
      const failedLinks = [];
      let successfulPings = 0;

      // Ping all links for this user
      for (const url of links) {
        console.log(`Pinging API endpoint: ${url} for ${email}`);
        
        const result = await pingUrl(url);
        
        if (result.success) {
          successfulPings++;
          const healthStatus = result.message || 'OK';
          console.log(`✓ ${url} - Status: ${result.status} (${result.responseTime}ms) - ${healthStatus}`);
        } else {
          failedLinks.push({
            url,
            error: result.error || 'Unknown error',
            status: result.status,
            responseTime: result.responseTime,
            code: result.code
          });
          console.log(`✗ ${url} - Error: ${result.error} (${result.responseTime || 0}ms)`);
        }

        // Small delay between requests to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Update user stats ONLY for successful pings
      const creditDeduction = successfulPings * 10; // Only charge for successful pings
      
      await updateUserStats(email, successfulPings, creditDeduction);

      // Send failure notification if there are failed links
      if (failedLinks.length > 0) {
        console.log(`Sending failure notification to ${email} for ${failedLinks.length} failed links`);
        await sendFailureEmail(email, failedLinks);
      }

      console.log(`Completed processing ${email}: ${successfulPings}/${links.length} successful pings (charged ${creditDeduction} credits)`);
      
      // Delay between users to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Link monitoring completed successfully');

  } catch (error) {
    console.error('Error in link monitoring:', error);
    process.exit(1);
  }
}

// Run the monitoring
monitorAllLinks()
  .then(() => {
    console.log('Monitoring process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });