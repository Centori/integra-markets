#!/usr/bin/env node
/**
 * TestSprite Test Runner
 * Executes comprehensive AI-powered testing for frontend components, API endpoints, and authentication flows
 */

import TestSprite from './TestSprite.js';
import fs from 'fs';
import path from 'path';

class TestSpriteRunner {
  constructor() {
    this.testSprite = null;
    this.results = {
      frontend: [],
      api: [],
      auth: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        startTime: null,
        endTime: null,
        duration: 0
      }
    };
  }

  /**
   * Initialize TestSprite runner
   */
  async initialize() {
    console.log('🚀 Initializing TestSprite AI Testing Framework...');
    
    try {
      this.testSprite = new TestSprite();
      await this.testSprite.initialize();
      console.log('✅ TestSprite initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize TestSprite:', error.message);
      throw error;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.results.summary.startTime = new Date();
    console.log(`\n🧪 Starting comprehensive testing at ${this.results.summary.startTime.toISOString()}`);
    
    try {
      // Run frontend component tests
      console.log('\n📱 Testing Frontend Components...');
      this.results.frontend = await this.testSprite.testFrontendComponents();
      this.logTestResults('Frontend', this.results.frontend);

      // Run API endpoint tests
      console.log('\n🌐 Testing API Endpoints...');
      this.results.api = await this.testSprite.testAPIEndpoints();
      this.logTestResults('API', this.results.api);

      // Run authentication flow tests
      console.log('\n🔐 Testing Authentication Flows...');
      this.results.auth = await this.testSprite.testAuthenticationFlows();
      this.logTestResults('Authentication', this.results.auth);

      // Generate AI suggestions
      console.log('\n🤖 Generating AI Test Suggestions...');
      const suggestions = await this.testSprite.generateAISuggestions(this.getAllResults());
      this.logAISuggestions(suggestions);

    } catch (error) {
      console.error('❌ Error during testing:', error.message);
      throw error;
    } finally {
      this.results.summary.endTime = new Date();
      this.results.summary.duration = this.results.summary.endTime - this.results.summary.startTime;
    }
  }

  /**
   * Run specific test category
   */
  async runSpecificTests(category) {
    this.results.summary.startTime = new Date();
    console.log(`\n🧪 Starting ${category} testing at ${this.results.summary.startTime.toISOString()}`);
    
    try {
      switch (category.toLowerCase()) {
        case 'frontend':
        case 'components':
          console.log('\n📱 Testing Frontend Components...');
          this.results.frontend = await this.testSprite.testFrontendComponents();
          this.logTestResults('Frontend', this.results.frontend);
          break;
          
        case 'api':
        case 'endpoints':
          console.log('\n🌐 Testing API Endpoints...');
          this.results.api = await this.testSprite.testAPIEndpoints();
          this.logTestResults('API', this.results.api);
          break;
          
        case 'auth':
        case 'authentication':
          console.log('\n🔐 Testing Authentication Flows...');
          this.results.auth = await this.testSprite.testAuthenticationFlows();
          this.logTestResults('Authentication', this.results.auth);
          break;
          
        default:
          throw new Error(`Unknown test category: ${category}`);
      }

      // Generate AI suggestions for specific category
      console.log('\n🤖 Generating AI Test Suggestions...');
      const suggestions = await this.testSprite.generateAISuggestions(this.getAllResults());
      this.logAISuggestions(suggestions);

    } catch (error) {
      console.error('❌ Error during testing:', error.message);
      throw error;
    } finally {
      this.results.summary.endTime = new Date();
      this.results.summary.duration = this.results.summary.endTime - this.results.summary.startTime;
    }
  }

  /**
   * Get all test results
   */
  getAllResults() {
    return [
      ...this.results.frontend,
      ...this.results.api,
      ...this.results.auth
    ];
  }

  /**
   * Log test results for a category
   */
  logTestResults(category, results) {
    if (!results || results.length === 0) {
      console.log(`   No ${category.toLowerCase()} tests executed`);
      return;
    }

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const total = results.length;

    console.log(`   ${category} Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)`);
    
    // Update summary
    this.results.summary.totalTests += total;
    this.results.summary.passed += passed;
    this.results.summary.failed += failed;
    this.results.summary.skipped += skipped;

    // Log failed tests
    const failedTests = results.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      console.log(`   ❌ Failed ${category} Tests:`);
      failedTests.forEach(test => {
        const identifier = test.component || test.endpoint || test.flow || 'Unknown';
        console.log(`      - ${identifier}: ${test.test} - ${test.error || 'Unknown error'}`);
      });
    }
  }

  /**
   * Log AI suggestions
   */
  logAISuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      console.log('   No AI suggestions generated');
      return;
    }

    console.log('\n💡 AI Test Suggestions:');
    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion.category}: ${suggestion.suggestion}`);
      if (suggestion.priority) {
        console.log(`      Priority: ${suggestion.priority}`);
      }
      if (suggestion.implementation) {
        console.log(`      Implementation: ${suggestion.implementation}`);
      }
    });
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    const report = {
      metadata: {
        framework: 'TestSprite AI Testing Framework',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        duration: this.results.summary.duration,
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        }
      },
      summary: this.results.summary,
      results: {
        frontend: this.results.frontend,
        api: this.results.api,
        authentication: this.results.auth
      },
      statistics: this.generateStatistics(),
      recommendations: await this.generateRecommendations()
    };

    // Save report to file
    const reportPath = path.join(process.cwd(), '__tests__', 'reports', `testsprite-report-${Date.now()}.json`);
    await this.ensureDirectoryExists(path.dirname(reportPath));
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Test report saved to: ${reportPath}`);
    
    // Generate HTML report
    await this.generateHTMLReport(report, reportPath.replace('.json', '.html'));
    
    return report;
  }

  /**
   * Generate test statistics
   */
  generateStatistics() {
    const allResults = this.getAllResults();
    
    const stats = {
      byCategory: {
        frontend: this.getCategoryStats(this.results.frontend),
        api: this.getCategoryStats(this.results.api),
        authentication: this.getCategoryStats(this.results.auth)
      },
      byStatus: {
        passed: allResults.filter(r => r.status === 'passed').length,
        failed: allResults.filter(r => r.status === 'failed').length,
        skipped: allResults.filter(r => r.status === 'skipped').length
      },
      successRate: this.results.summary.totalTests > 0 
        ? (this.results.summary.passed / this.results.summary.totalTests * 100).toFixed(2)
        : 0,
      averageTestDuration: this.calculateAverageTestDuration(allResults)
    };

    return stats;
  }

  /**
   * Get statistics for a specific category
   */
  getCategoryStats(results) {
    if (!results || results.length === 0) {
      return { total: 0, passed: 0, failed: 0, skipped: 0, successRate: 0 };
    }

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const total = results.length;

    return {
      total,
      passed,
      failed,
      skipped,
      successRate: total > 0 ? (passed / total * 100).toFixed(2) : 0
    };
  }

  /**
   * Calculate average test duration
   */
  calculateAverageTestDuration(results) {
    if (!results || results.length === 0) return 0;
    
    const durations = results
      .filter(r => r.duration)
      .map(r => r.duration);
    
    if (durations.length === 0) return 0;
    
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    return (total / durations.length).toFixed(2);
  }

  /**
   * Generate recommendations based on test results
   */
  async generateRecommendations() {
    const allResults = this.getAllResults();
    const failedTests = allResults.filter(r => r.status === 'failed');
    const recommendations = [];

    // Analyze failed tests
    if (failedTests.length > 0) {
      recommendations.push({
        category: 'Critical Issues',
        priority: 'high',
        description: `${failedTests.length} tests failed and require immediate attention`,
        actions: failedTests.map(test => ({
          test: test.test,
          component: test.component || test.endpoint || test.flow,
          error: test.error,
          suggestion: this.generateFailureRecommendation(test)
        }))
      });
    }

    // Analyze success rate
    const successRate = this.results.summary.totalTests > 0 
      ? (this.results.summary.passed / this.results.summary.totalTests * 100)
      : 0;

    if (successRate < 80) {
      recommendations.push({
        category: 'Test Coverage',
        priority: 'medium',
        description: `Success rate is ${successRate.toFixed(2)}%, consider improving test reliability`,
        actions: [
          'Review failed test cases and fix underlying issues',
          'Add more comprehensive error handling',
          'Improve test data and mock configurations'
        ]
      });
    }

    // Analyze skipped tests
    const skippedTests = allResults.filter(r => r.status === 'skipped');
    if (skippedTests.length > 0) {
      recommendations.push({
        category: 'Test Completeness',
        priority: 'low',
        description: `${skippedTests.length} tests were skipped`,
        actions: [
          'Review skipped tests and determine if they can be enabled',
          'Ensure test environment supports all required features',
          'Add missing dependencies or configurations'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate failure-specific recommendation
   */
  generateFailureRecommendation(test) {
    const error = test.error?.toLowerCase() || '';
    
    if (error.includes('network') || error.includes('fetch')) {
      return 'Check network connectivity and API endpoint availability';
    }
    
    if (error.includes('auth') || error.includes('token')) {
      return 'Verify authentication configuration and token management';
    }
    
    if (error.includes('timeout')) {
      return 'Increase timeout values or optimize performance';
    }
    
    if (error.includes('mock') || error.includes('undefined')) {
      return 'Review mock configurations and ensure all dependencies are properly mocked';
    }
    
    return 'Review test implementation and fix the underlying issue';
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(report, htmlPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TestSprite Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { color: #6c757d; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .passed { background-color: #d4edda; border-left: 4px solid #28a745; }
        .failed { background-color: #f8d7da; border-left: 4px solid #dc3545; }
        .skipped { background-color: #fff3cd; border-left: 4px solid #ffc107; }
        .recommendation { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .priority-high { border-left: 4px solid #dc3545; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 TestSprite AI Testing Report</h1>
            <p>Generated on ${new Date(report.metadata.timestamp).toLocaleString()}</p>
            <p>Duration: ${(report.metadata.duration / 1000).toFixed(2)} seconds</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${report.summary.totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.statistics.successRate}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
        </div>
        
        ${this.generateHTMLSection('Frontend Components', report.results.frontend)}
        ${this.generateHTMLSection('API Endpoints', report.results.api)}
        ${this.generateHTMLSection('Authentication Flows', report.results.authentication)}
        
        <div class="section">
            <h2>📋 Recommendations</h2>
            ${report.recommendations.map(rec => `
                <div class="recommendation priority-${rec.priority}">
                    <h3>${rec.category}</h3>
                    <p>${rec.description}</p>
                    ${Array.isArray(rec.actions) ? 
                        `<ul>${rec.actions.map(action => `<li>${typeof action === 'string' ? action : action.suggestion}</li>`).join('')}</ul>` :
                        ''
                    }
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    await fs.promises.writeFile(htmlPath, html);
    console.log(`📊 HTML report saved to: ${htmlPath}`);
  }

  /**
   * Generate HTML section for test results
   */
  generateHTMLSection(title, results) {
    if (!results || results.length === 0) {
      return `<div class="section"><h2>${title}</h2><p>No tests executed</p></div>`;
    }

    return `
        <div class="section">
            <h2>${title}</h2>
            ${results.map(result => `
                <div class="test-result ${result.status}">
                    <strong>${result.component || result.endpoint || result.flow || 'Unknown'}</strong> - ${result.test}
                    ${result.error ? `<br><small>Error: ${result.error}</small>` : ''}
                    ${result.statusCode ? `<br><small>Status Code: ${result.statusCode}</small>` : ''}
                </div>
            `).join('')}
        </div>
    `;
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Print final summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TESTSPRITE TESTING SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${this.results.summary.totalTests}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⏭️  Skipped: ${this.results.summary.skipped}`);
    
    const successRate = this.results.summary.totalTests > 0 
      ? (this.results.summary.passed / this.results.summary.totalTests * 100).toFixed(2)
      : 0;
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️  Duration: ${(this.results.summary.duration / 1000).toFixed(2)} seconds`);
    console.log('='.repeat(60));
    
    if (this.results.summary.failed > 0) {
      console.log('⚠️  Some tests failed. Check the detailed report for more information.');
    } else {
      console.log('🎉 All tests passed successfully!');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.testSprite) {
      await this.testSprite.cleanup();
    }
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestSpriteRunner();
  
  async function main() {
    try {
      await runner.initialize();
      
      const args = process.argv.slice(2);
      const category = args[0];
      
      if (category && ['frontend', 'api', 'auth', 'components', 'endpoints', 'authentication'].includes(category.toLowerCase())) {
        await runner.runSpecificTests(category);
      } else {
        await runner.runAllTests();
      }
      
      await runner.generateReport();
      runner.printSummary();
      
    } catch (error) {
      console.error('❌ TestSprite execution failed:', error.message);
      process.exit(1);
    } finally {
      await runner.cleanup();
    }
  }
  
  main();
}

export { TestSpriteRunner };
export default TestSpriteRunner;