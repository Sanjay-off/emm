require('dotenv').config();

const BATCH_SIZE           = parseInt(process.env.BULK_BATCH_SIZE)                  || 10;
const DELAY_BETWEEN_EMAILS = parseInt(process.env.BULK_DELAY_BETWEEN_EMAILS_MS)     || 150;
const DELAY_BETWEEN_BATCHES = parseInt(process.env.BULK_DELAY_BETWEEN_BATCHES_MS)   || 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends emails in rate-limited batches.
 *
 * @param {Array}    recipients  - Array of recipient objects (anything your sendFn needs)
 * @param {Function} sendFn      - async (recipient) => void  — called per recipient
 * @returns {{ sent: number, failed: Array<{ recipient, error }> }}
 */
async function sendInBatches(recipients, sendFn) {
  const results = { sent: 0, failed: [] };

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);

    console.log(`[Bulk] Sending batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);

    for (const recipient of batch) {
      try {
        await sendFn(recipient);
        results.sent++;
      } catch (err) {
        console.error(`[Bulk] Failed for ${recipient.email}:`, err.message);
        results.failed.push({ recipient, error: err.message });
      }

      // Delay between individual emails inside the batch
      await sleep(DELAY_BETWEEN_EMAILS);
    }

    // Delay between batches (skip after the last batch)
    if (i + BATCH_SIZE < recipients.length) {
      console.log(`[Bulk] Batch ${batchNumber} done. Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log(`[Bulk] Completed. Sent: ${results.sent}, Failed: ${results.failed.length}`);
  return results;
}

module.exports = { sendInBatches };