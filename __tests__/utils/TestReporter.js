/**
 * TestReporter - Test Result Reporting Utility
 * Formats and reports test results in various formats
 */

export class TestReporter {
  constructor() {
    this.results = [];
  }

  /**
   * Add test result
   */
  addResult(result) {
    this.results.push({
      ...result,
      timestamp: result.timestamp || new Date().toISOString()
    });
  }

  /**
   * Add multiple test results
   */
  addResults(results) {
    results.forEach(result => this.addResult(result));
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const successRate = total > 0 ? (passed / total * 100).toFixed(2) : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      successRate: parseFloat(successRate)
    };
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    const summary = this.generateSummary();
    const categorizedResults = this.categorizeResults();

    return {
      summary,
      results: categorizedResults,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Categorize results by type
   */
  categorizeResults() {
    const categories = {
      frontend: [],
      api: [],
      auth: [],
      other: []
    };

    this.results.forEach(result => {
      if (result.component) {
        categories.frontend.push(result);
      } else if (result.endpoint) {
        categories.api.push(result);
      } else if (result.flow) {
        categories.auth.push(result);
      } else {
        categories.other.push(result);
      }
    });

    return categories;
  }

  /**
   * Format results for console output
   */
  formatForConsole() {
    const summary = this.generateSummary();
    let output = '\n' + '='.repeat(60) + '\n';
    output += '📊 TEST RESULTS SUMMARY\n';
    output += '='.repeat(60) + '\n';
    output += `Total Tests: ${summary.total}\n`;
    output += `✅ Passed: ${summary.passed}\n`;
    output += `❌ Failed: ${summary.failed}\n`;
    output += `⏭️  Skipped: ${summary.skipped}\n`;
    output += `📈 Success Rate: ${summary.successRate}%\n`;
    output += '='.repeat(60) + '\n';

    // Add failed tests details
    const failedTests = this.results.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      output += '\n❌ FAILED TESTS:\n';
      failedTests.forEach(test => {
        const identifier = test.component || test.endpoint || test.flow || 'Unknown';
        output += `  - ${identifier}: ${test.test}\n`;
        if (test.error) {
          output += `    Error: ${test.error}\n`;
        }
      });
    }

    return output;
  }

  /**
   * Clear all results
   */
  clear() {
    this.results = [];
  }

  /**
   * Get results by status
   */
  getResultsByStatus(status) {
    return this.results.filter(r => r.status === status);
  }

  /**
   * Get results by category
   */
  getResultsByCategory(category) {
    switch (category.toLowerCase()) {
      case 'frontend':
        return this.results.filter(r => r.component);
      case 'api':
        return this.results.filter(r => r.endpoint);
      case 'auth':
        return this.results.filter(r => r.flow);
      default:
        return this.results;
    }
  }
}

export default TestReporter;