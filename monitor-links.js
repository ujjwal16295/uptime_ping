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

// Function to send zero credit notification email
async function sendZeroCreditEmail(email) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NapStopper - Credit Required</title>
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
            <div style="background: #fef3c7; padding: 12px; border-radius: 16px; width: 64px; height: 64px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px;">💳</span>
            </div>
            <h2 style="font-size: 32px; font-weight: bold; color: #111827; margin: 0 0 8px 0;">Credit Required</h2>
            <p style="color: #6b7280; font-size: 16px; margin: 0;">
              Your account has insufficient credits to continue monitoring
            </p>
          </div>

          <!-- Message -->
          <div style="background: linear-gradient(135deg, #fef7ed 0%, #fef3c7 100%); padding: 24px; border-radius: 16px; border: 1px solid #fed7aa; margin-bottom: 32px; text-align: center;">
            <h3 style="font-size: 20px; font-weight: 600; color: #92400e; margin: 0 0 12px 0;">Monitoring Paused</h3>
            <p style="color: #451a03; font-size: 16px; margin: 0 0 16px 0;">
              Your credit balance is too low to continue monitoring your API endpoints. 
              Each successful ping costs 10 credits.
            </p>
            <p style="color: #451a03; font-size: 14px; margin: 0;">
              <strong>Don't worry!</strong> Your monitoring will automatically resume once you add credits to your account.
            </p>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://uptime-frontend-ivory.vercel.app/" style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); border-radius: 12px; padding: 16px 32px; display: inline-block; text-decoration: none; color: white; font-weight: 600; font-size: 16px;">
              Login & Get Credits
            </a>
          </div>

          <!-- Instructions -->
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0;">How to add credits:</h3>
            <ol style="color: #6b7280; font-size: 14px; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Click the "Login & Get Credits" button above</li>
              <li style="margin-bottom: 8px;">Log into your NapStopper account</li>
              <li style="margin-bottom: 8px;">Navigate to the credits section</li>
              <li style="margin-bottom: 8px;">Purchase the credits package that suits your needs</li>
              <li>Your monitoring will automatically resume within the next cycle</li>
            </ol>
          </div>

          <!-- Footer Message -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Best regards,<br>
              <strong>NapStopper Monitoring Service</strong>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Notification sent at ${new Date().toLocaleString()}
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
    subject: '💳 NapStopper - Credit Required to Continue Monitoring',
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Zero credit notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send zero credit email to ${email}:`, error.message);
    return false;
  }
}

// Function to ping a URL with retry logic for zero ping count users
async function pingUrl(url, timeout = 30000, isZeroPingUser = false) {
  const maxRetries = isZeroPingUser ? 3 : 1; // More retries for zero ping users
  const baseTimeout = isZeroPingUser ? 45000 : timeout; // Longer timeout for zero ping users
  const retryDelay = isZeroPingUser ? 5000 : 1000; // Longer delay between retries
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const currentTimeout = baseTimeout + (attempt - 1) * 15000; // Increase timeout with each retry
    const startTime = Date.now();
    
    console.log(`Attempt ${attempt}/${maxRetries} for ${url}${isZeroPingUser ? ' (zero ping user - extended timeout)' : ''} - Timeout: ${currentTimeout}ms`);
    
    try {
      const response = await axios.get(url, {
        timeout: currentTimeout,
        validateStatus: (status) => status >= 200 && status < 400,
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
        responseData = response.data;
      }
      
      console.log(`✓ Success on attempt ${attempt} for ${url} (${responseTime}ms)`);
      
      return {
        success: true,
        status: response.status,
        responseTime,
        data: responseData,
        message: responseData?.message || responseData?.status || 'OK',
        attempts: attempt
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // If this is the last attempt, return the error
      if (attempt === maxRetries) {
        console.log(`✗ Failed after ${attempt} attempts for ${url}`);
        
        if (error.response) {
          return {
            success: false,
            status: error.response.status,
            error: `HTTP ${error.response.status}: ${error.response.statusText}`,
            responseTime,
            code: error.code,
            attempts: attempt
          };
        }
        
        return {
          success: false,
          error: error.message,
          responseTime,
          code: error.code,
          attempts: attempt
        };
      }
      
      // Log the attempt failure and wait before retry
      console.log(`✗ Attempt ${attempt} failed for ${url}: ${error.message} - Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
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
      const attempts = link.attempts > 1 
        ? ` - Failed after ${link.attempts} attempts` 
        : '';
      
      return `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
          <div style="font-weight: 600; color: #111827; margin-bottom: 8px; word-break: break-all;">
            ${link.url}
          </div>
          <div style="color: #dc2626; font-size: 14px; background: #fef2f2; padding: 8px 12px; border-radius: 8px; border: 1px solid #fecaca;">
            ${errorDetails}${responseTime}${attempts}
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
                <span style="color: #451a03;">API took too long to respond (>30 seconds for regular users, >45 seconds for new users)</span>
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
    // First, fetch users with zero or insufficient credits to send notifications
    const { data: insufficientCreditUsers, error: insufficientFetchError } = await supabase
      .from('users')
      .select('email, links, credit')
      .lte('credit', 9) // Users with 9 or fewer credits (insufficient for even 1 ping)
      .not('links', 'is', null); // Only users who have links to monitor

    if (insufficientFetchError) {
      console.error('Error fetching insufficient credit users:', insufficientFetchError);
    } else if (insufficientCreditUsers && insufficientCreditUsers.length > 0) {
      console.log(`Found ${insufficientCreditUsers.length} users with insufficient credits, sending notifications...`);
      
      for (const user of insufficientCreditUsers) {
        if (user.links && user.links.length > 0) {
          console.log(`Sending zero credit notification to ${user.email} (credit: ${user.credit})`);
          await sendZeroCreditEmail(user.email);
          
          // Small delay between emails
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Now fetch users with sufficient credit for monitoring
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('email, links, credit, ping')
      .gte('credit', 10); // Only process users with credit >= 10 (enough for at least 1 successful ping)

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
    }

    console.log(`Found ${users.length} users with sufficient credit to process`);

    // Process each user
    for (const user of users) {
      const { email, links, credit, ping } = user;
      
      // Skip users with no links
      if (!links || links.length === 0) {
        console.log(`Skipping ${email}: no links to monitor`);
        continue;
      }

      // Determine if this is a zero ping user (new user or no successful pings yet)
      const isZeroPingUser = ping === 0;
      console.log(`Processing ${email}: ${links.length} links ${isZeroPingUser ? '(zero ping user - extended retry logic)' : ''} (credit: ${credit})`);
      
      const failedLinks = [];
      let successfulPings = 0;

      // Ping all links for this user
      for (const url of links) {
        console.log(`Pinging API endpoint: ${url} for ${email}${isZeroPingUser ? ' with extended timeout' : ''}`);
        
        const result = await pingUrl(url, 30000, isZeroPingUser);
        
        if (result.success) {
          successfulPings++;
          const healthStatus = result.message || 'OK';
          const attemptInfo = result.attempts > 1 ? ` (succeeded on attempt ${result.attempts})` : '';
          console.log(`✓ ${url} - Status: ${result.status} (${result.responseTime}ms) - ${healthStatus}${attemptInfo}`);
        } else {
          failedLinks.push({
            url,
            error: result.error || 'Unknown error',
            status: result.status,
            responseTime: result.responseTime,
            code: result.code,
            attempts: result.attempts
          });
          console.log(`✗ ${url} - Error: ${result.error} (${result.responseTime || 0}ms) - Failed after ${result.attempts} attempts`);
        }

        // Small delay between requests to be respectful to APIs
        // Longer delay for zero ping users to avoid overwhelming potentially slow services
        const delayTime = isZeroPingUser ? 1000 : 200;
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }

      // Update user stats ONLY for successful pings
      const creditDeduction = successfulPings * 10; // Only charge for successful pings
      
      await updateUserStats(email, successfulPings, creditDeduction);

      // Send failure notification if there are failed links
      if (failedLinks.length > 0) {
        console.log(`Sending failure notification to ${email} for ${failedLinks.length} failed links`);
        await sendFailureEmail(email, failedLinks);
      }

      console.log(`Completed processing ${email}: ${successfulPings}/${links.length} successful pings (charged ${creditDeduction} credits)${isZeroPingUser ? ' - Used extended retry logic' : ''}`);
      
      // Delay between users to avoid overwhelming the system
      // Longer delay after processing zero ping users
      const userDelayTime = isZeroPingUser ? 2000 : 500;
      await new Promise(resolve => setTimeout(resolve, userDelayTime));
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