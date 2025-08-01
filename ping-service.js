const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Ping a single URL
async function pingUrl(url, id) {
  try {
    console.log(`🔄 Pinging: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'KeepAlive-Ping-Service/1.0',
        'Accept': 'application/json, text/plain, */*',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Update ping count and last pinged time in database
    const { error: updateError } = await supabase
      .from('monitored_urls')
      .update({ 
        ping_count: supabase.sql`ping_count + 1`,
        last_pinged_at: new Date().toISOString(),
        last_response_time: responseTime,
        last_status_code: response.status,
        is_healthy: response.ok
      })
      .eq('id', id);

    if (updateError) {
      console.error(`❌ Failed to update database for ${url}:`, updateError.message);
    }

    if (response.ok) {
      console.log(`✅ Success: ${url} (${response.status}) - ${responseTime}ms`);
      return { success: true, url, status: response.status, responseTime };
    } else {
      console.log(`⚠️  Warning: ${url} returned ${response.status} - ${responseTime}ms`);
      return { success: false, url, status: response.status, responseTime, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    console.error(`❌ Error pinging ${url}:`, error.message);
    
    // Still update the database with error info
    const { error: updateError } = await supabase
      .from('monitored_urls')
      .update({ 
        ping_count: supabase.sql`ping_count + 1`,
        last_pinged_at: new Date().toISOString(),
        last_error: error.message,
        is_healthy: false
      })
      .eq('id', id);

    if (updateError) {
      console.error(`❌ Failed to update database for ${url}:`, updateError.message);
    }
    
    return { success: false, url, error: error.message };
  }
}

// Get all active URLs from database
async function getAllUrls() {
  try {
    const { data, error } = await supabase
      .from('monitored_urls')
      .select('id, url')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ Failed to fetch URLs from database:', error.message);
    return [];
  }
}

// Main ping function
async function pingAllUrls() {
  const startTime = new Date();
  console.log(`\n🚀 Starting ping cycle at ${startTime.toISOString()}`);
  console.log('=' .repeat(60));
  
  try {
    // Get all URLs from database
    const urls = await getAllUrls();
    
    if (urls.length === 0) {
      console.log('📭 No URLs found in database to ping.');
      return;
    }
    
    console.log(`📋 Found ${urls.length} URL(s) to ping:`);
    urls.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.url}`);
    });
    console.log('');
    
    // Ping all URLs concurrently (but with a reasonable limit)
    const batchSize = 5; // Ping 5 URLs at a time to avoid overwhelming
    const results = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(item => pingUrl(item.url, item.id));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const endTime = new Date();
    const duration = endTime - startTime;
    
    console.log('');
    console.log('=' .repeat(60));
    console.log(`📊 Ping cycle completed in ${duration}ms`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🕐 Finished at: ${endTime.toISOString()}`);
    
    // Log failed URLs for debugging
    if (failed > 0) {
      console.log('\n❌ Failed URLs:');
      results
        .filter(r => !r.success)
        .forEach(r => console.log(`   • ${r.url}: ${r.error}`));
    }
    
  } catch (error) {
    console.error('💥 Fatal error in ping cycle:', error.message);
    process.exit(1);
  }
}

// Run the ping cycle
if (require.main === module) {
  // Validate environment variables
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   • SUPABASE_URL');
    if (!supabaseKey) console.error('   • SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  pingAllUrls()
    .then(() => {
      console.log('\n🎉 Ping service completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Ping service failed:', error.message);
      process.exit(1);
    });
}

module.exports = { pingAllUrls, pingUrl, getAllUrls };
