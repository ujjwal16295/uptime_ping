const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize email transporter
const transporter = nodemailer.createTransport({
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
      
      return `<li>
        <strong>${link.url}</strong><br>
        <span style="color: #d32f2f; font-size: 14px;">
          ${errorDetails}${responseTime}
        </span>
      </li>`;
    })
    .join('');

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">🚨 API Health Check Alert</h2>
      <p>Hello,</p>
      <p>The following API endpoints in your monitoring list have failed their health checks:</p>
      <ul style="line-height: 1.6;">
        ${failedLinksHtml}
      </ul>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">What this means:</h3>
        <ul>
          <li><strong>HTTP 4xx errors:</strong> Client-side issues (URL not found, authentication, etc.)</li>
          <li><strong>HTTP 5xx errors:</strong> Server-side issues (API down, internal errors)</li>
          <li><strong>Timeout errors:</strong> API took too long to respond (>30 seconds)</li>
          <li><strong>Network errors:</strong> Unable to reach the API endpoint</li>
        </ul>
      </div>
      <p>Please check these API endpoints and investigate any issues.</p>
      <br>
      <p style="color: #666; font-size: 14px;">
        Best regards,<br>
        Link Monitor Service<br>
        <em>Monitoring performed at ${new Date().toISOString()}</em>
      </p>
    </div>
  `;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: `🚨 API Monitor Alert - ${failedLinks.length} Endpoint(s) Failed`,
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

// Function to update user stats (ping count and credit)
async function updateUserStats(email, pingCount, creditDeduction) {
  try {
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
    const newPing = existingUser.ping + pingCount;
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

    console.log(`Updated ${email}: ping=${newPing}, credit=${newCredit}`);
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

      // Skip users with insufficient credit
      const requiredCredit = links.length * 10;
      if (credit < requiredCredit) {
        console.log(`Skipping ${email}: insufficient credit (has ${credit}, needs ${requiredCredit})`);
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

      // Update user stats (ping count and credit deduction)
      const totalPings = links.length;
      const creditDeduction = totalPings * 10;
      
      await updateUserStats(email, totalPings, creditDeduction);

      // Send failure notification if there are failed links
      if (failedLinks.length > 0) {
        console.log(`Sending failure notification to ${email} for ${failedLinks.length} failed links`);
        await sendFailureEmail(email, failedLinks);
      }

      console.log(`Completed processing ${email}: ${successfulPings}/${totalPings} successful pings`);
      
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