import * as core from '@actions/core';
import * as github from '@actions/github';
import { scanForSecrets } from './scanner';
import { annotateFindings, reportSuccess } from './annotator';

async function run(): Promise<void> {
  try {
    // Enforce PR-only execution
    if (github.context.eventName !== 'pull_request' && github.context.eventName !== 'pull_request_target') {
      core.setFailed('NetShield only runs on pull requests');
      return;
    }

    core.info('🛡️ NetShield: Starting secrets scan...');
    core.info(`Event: ${github.context.eventName}`);
    core.info(`PR: #${github.context.payload.pull_request?.number}`);

    // Run the scan
    const result = await scanForSecrets();

    // Handle results
    if (result.blocked) {
      core.warning(`Found ${result.findings.length} secret(s)`);
      await annotateFindings(result.findings);
      // annotateFindings already calls setFailed
    } else {
      reportSuccess();
    }

    // Fire telemetry to platform API (non-blocking, best-effort)
    const apiKey = process.env.NETSHIELD_API_KEY;
    if (apiKey) {
      const apiUrl = process.env.NETSHIELD_API_URL || 'https://api.net-shield.net/api/v1/telemetry';
      const telemetryPayload = {
        tool_name: 'secret-scanner',
        repo: `${github.context.repo.owner}/${github.context.repo.repo}`,
        branch: github.context.payload.pull_request?.head?.ref || '',
        commit_sha: github.context.sha,
        decision: result.blocked ? 'BLOCK' : 'PASS',
        finding_count: result.findings.length,
        blocking_count: result.blocked ? result.findings.length : 0,
        metadata: {
          pr_number: github.context.payload.pull_request?.number,
          rules_triggered: result.findings.map(f => f.rule),
        },
      };

      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify(telemetryPayload),
          signal: AbortSignal.timeout(2000), // 2s timeout for GitHub Actions (more generous than CLI)
        });
      } catch {
        // Telemetry failure must never fail the action
        core.debug('Telemetry send failed (non-critical)');
      }
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`NetShield failed: ${error.message}`);
    } else {
      core.setFailed('NetShield failed with unknown error');
    }
  }
}

run();
