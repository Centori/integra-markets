/**
 * AuthTester - Authentication Flow Testing Module
 * Tests user authentication flows including login, signup, logout, and session management
 */

import AsyncStorage from '../mocks/@react-native-async-storage/async-storage.js';

export class AuthTester {
  constructor(config) {
    this.config = config;
    this.testResults = [];
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
    this.testUsers = {
      valid: {
        email: 'testuser@example.com',
        password: 'TestPass123!',
        name: 'Test User'
      },
      invalid: {
        email: 'invalid-email',
        password: '123',
        name: ''
      }
    };
  }

  async initialize() {
    // Clear any existing auth state
    await AsyncStorage.clear();
  }

  /**
   * Run all authentication flow tests
   */
  async runAllTests() {
    const results = [];

    for (const flow of this.config.flows) {
      try {
        const flowResults = await this.testAuthFlow(flow.name);
        results.push(...flowResults);
      } catch (error) {
        results.push({
          flow: flow.name,
          test: 'Auth Flow Test',
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    this.testResults = results;
    return results;
  }

  /**
   * Test a specific authentication flow
   */
  async testAuthFlow(flowName) {
    const flow = this.config.flows.find(f => f.name === flowName);
    if (!flow) {
      return [{
        flow: flowName,
        test: 'Flow Not Found',
        status: 'failed',
        error: `Auth flow ${flowName} not found in configuration`,
        timestamp: new Date().toISOString()
      }];
    }

    const results = [];
    console.log(`Testing ${flow.name} authentication flow...`);

    switch (flow.name) {
      case 'Email/Password Login':
        results.push(...await this.testUserLogin());
        break;
      case 'Google OAuth':
        results.push(...await this.testUserLogin()); // Use same login test for OAuth
        break;
      case 'User Registration':
        results.push(...await this.testUserRegistration());
        break;
      case 'Session Management':
        results.push(...await this.testSessionManagement());
        break;
      case 'Password Reset':
        results.push(...await this.testPasswordReset());
        break;
      case 'Token Refresh':
        results.push(...await this.testTokenRefresh());
        break;
      default:
        results.push({
          flow: flowName,
          test: 'Unknown Flow',
          status: 'failed',
          error: `Unknown auth flow: ${flowName}`,
          timestamp: new Date().toISOString()
        });
    }

    return results;
  }

  /**
   * Test user registration flow
   */
  async testUserRegistration() {
    const results = [];
    
    try {
      // Test valid registration
      const validRegistration = await this.attemptRegistration(this.testUsers.valid);
      results.push({
        flow: 'User Registration',
        test: 'Valid Registration',
        status: validRegistration.success ? 'passed' : 'failed',
        statusCode: validRegistration.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test invalid registration
      const invalidRegistration = await this.attemptRegistration(this.testUsers.invalid);
      results.push({
        flow: 'User Registration',
        test: 'Invalid Registration Rejection',
        status: !invalidRegistration.success ? 'passed' : 'failed',
        statusCode: invalidRegistration.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test duplicate registration
      const duplicateRegistration = await this.attemptRegistration(this.testUsers.valid);
      results.push({
        flow: 'User Registration',
        test: 'Duplicate Registration Prevention',
        status: !duplicateRegistration.success ? 'passed' : 'failed',
        statusCode: duplicateRegistration.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test registration data validation
      results.push(...await this.testRegistrationValidation());

    } catch (error) {
      results.push({
        flow: 'User Registration',
        test: 'Registration Flow',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Attempt user registration
   */
  async attemptRegistration(userData) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        statusCode: response.status,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test registration data validation
   */
  async testRegistrationValidation() {
    const results = [];
    const validationTests = [
      {
        name: 'Empty Email',
        data: { ...this.testUsers.valid, email: '' },
        shouldFail: true
      },
      {
        name: 'Invalid Email Format',
        data: { ...this.testUsers.valid, email: 'invalid-email' },
        shouldFail: true
      },
      {
        name: 'Weak Password',
        data: { ...this.testUsers.valid, password: '123' },
        shouldFail: true
      },
      {
        name: 'Empty Name',
        data: { ...this.testUsers.valid, name: '' },
        shouldFail: true
      }
    ];

    for (const test of validationTests) {
      try {
        const result = await this.attemptRegistration(test.data);
        const passed = test.shouldFail ? !result.success : result.success;
        
        results.push({
          flow: 'User Registration',
          test: `Validation - ${test.name}`,
          status: passed ? 'passed' : 'failed',
          statusCode: result.statusCode,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          flow: 'User Registration',
          test: `Validation - ${test.name}`,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Test user login flow
   */
  async testUserLogin() {
    const results = [];
    
    try {
      // Test valid login
      const validLogin = await this.attemptLogin(this.testUsers.valid.email, this.testUsers.valid.password);
      results.push({
        flow: 'User Login',
        test: 'Valid Login',
        status: validLogin.success ? 'passed' : 'failed',
        statusCode: validLogin.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test invalid credentials
      const invalidLogin = await this.attemptLogin(this.testUsers.valid.email, 'wrongpassword');
      results.push({
        flow: 'User Login',
        test: 'Invalid Credentials Rejection',
        status: !invalidLogin.success ? 'passed' : 'failed',
        statusCode: invalidLogin.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test non-existent user
      const nonExistentLogin = await this.attemptLogin('nonexistent@example.com', 'password');
      results.push({
        flow: 'User Login',
        test: 'Non-existent User Rejection',
        status: !nonExistentLogin.success ? 'passed' : 'failed',
        statusCode: nonExistentLogin.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test login data validation
      results.push(...await this.testLoginValidation());

      // Test token storage
      if (validLogin.success && validLogin.data.access_token) {
        results.push(...await this.testTokenStorage(validLogin.data.access_token));
      }

    } catch (error) {
      results.push({
        flow: 'User Login',
        test: 'Login Flow',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Attempt user login
   */
  async attemptLogin(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        statusCode: response.status,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test login data validation
   */
  async testLoginValidation() {
    const results = [];
    const validationTests = [
      {
        name: 'Empty Email',
        email: '',
        password: this.testUsers.valid.password,
        shouldFail: true
      },
      {
        name: 'Empty Password',
        email: this.testUsers.valid.email,
        password: '',
        shouldFail: true
      },
      {
        name: 'Invalid Email Format',
        email: 'invalid-email',
        password: this.testUsers.valid.password,
        shouldFail: true
      }
    ];

    for (const test of validationTests) {
      try {
        const result = await this.attemptLogin(test.email, test.password);
        const passed = test.shouldFail ? !result.success : result.success;
        
        results.push({
          flow: 'User Login',
          test: `Validation - ${test.name}`,
          status: passed ? 'passed' : 'failed',
          statusCode: result.statusCode,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          flow: 'User Login',
          test: `Validation - ${test.name}`,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Test token storage
   */
  async testTokenStorage(token) {
    const results = [];
    
    try {
      // Test storing token
      await AsyncStorage.setItem('authToken', token);
      const storedToken = await AsyncStorage.getItem('authToken');
      
      results.push({
        flow: 'User Login',
        test: 'Token Storage',
        status: storedToken === token ? 'passed' : 'failed',
        timestamp: new Date().toISOString()
      });

      // Test token retrieval
      const retrievedToken = await AsyncStorage.getItem('authToken');
      results.push({
        flow: 'User Login',
        test: 'Token Retrieval',
        status: retrievedToken === token ? 'passed' : 'failed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      results.push({
        flow: 'User Login',
        test: 'Token Storage',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Test user logout flow
   */
  async testUserLogout() {
    const results = [];
    
    try {
      // First login to get a token
      const loginResult = await this.attemptLogin(this.testUsers.valid.email, this.testUsers.valid.password);
      
      if (loginResult.success && loginResult.data.access_token) {
        const token = loginResult.data.access_token;
        await AsyncStorage.setItem('authToken', token);

        // Test logout
        const logoutResult = await this.attemptLogout(token);
        results.push({
          flow: 'User Logout',
          test: 'Logout Request',
          status: logoutResult.success ? 'passed' : 'failed',
          statusCode: logoutResult.statusCode,
          timestamp: new Date().toISOString()
        });

        // Test token removal
        await AsyncStorage.removeItem('authToken');
        const removedToken = await AsyncStorage.getItem('authToken');
        results.push({
          flow: 'User Logout',
          test: 'Token Removal',
          status: removedToken === null ? 'passed' : 'failed',
          timestamp: new Date().toISOString()
        });

        // Test accessing protected resource after logout
        const protectedAccess = await this.testProtectedAccess(token);
        results.push({
          flow: 'User Logout',
          test: 'Protected Access After Logout',
          status: !protectedAccess.success ? 'passed' : 'failed',
          statusCode: protectedAccess.statusCode,
          timestamp: new Date().toISOString()
        });
      } else {
        results.push({
          flow: 'User Logout',
          test: 'Logout Flow',
          status: 'skipped',
          reason: 'Could not obtain valid login token',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      results.push({
        flow: 'User Logout',
        test: 'Logout Flow',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Attempt user logout
   */
  async attemptLogout(token) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        statusCode: response.status,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test accessing protected resource
   */
  async testProtectedAccess(token) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        statusCode: response.status,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test session management
   */
  async testSessionManagement() {
    const results = [];
    
    try {
      // Test session persistence
      const loginResult = await this.attemptLogin(this.testUsers.valid.email, this.testUsers.valid.password);
      
      if (loginResult.success && loginResult.data.access_token) {
        const token = loginResult.data.access_token;
        
        // Store token
        await AsyncStorage.setItem('authToken', token);
        
        // Test session validation
        const sessionValid = await this.validateSession(token);
        results.push({
          flow: 'Session Management',
          test: 'Session Validation',
          status: sessionValid.success ? 'passed' : 'failed',
          statusCode: sessionValid.statusCode,
          timestamp: new Date().toISOString()
        });

        // Test session expiry handling
        results.push(...await this.testSessionExpiry());
      } else {
        results.push({
          flow: 'Session Management',
          test: 'Session Management',
          status: 'skipped',
          reason: 'Could not obtain valid login token',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      results.push({
        flow: 'Session Management',
        test: 'Session Management',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Validate session
   */
  async validateSession(token) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        statusCode: response.status,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test session expiry handling
   */
  async testSessionExpiry() {
    const results = [];
    
    try {
      // Test with expired/invalid token
      const expiredToken = 'expired.jwt.token';
      const expiredResult = await this.validateSession(expiredToken);
      
      results.push({
        flow: 'Session Management',
        test: 'Expired Token Handling',
        status: !expiredResult.success ? 'passed' : 'failed',
        statusCode: expiredResult.statusCode,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      results.push({
        flow: 'Session Management',
        test: 'Session Expiry',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Test password reset flow
   */
  async testPasswordReset() {
    const results = [];
    
    try {
      // Test password reset request
      const resetRequest = await this.requestPasswordReset(this.testUsers.valid.email);
      results.push({
        flow: 'Password Reset',
        test: 'Reset Request',
        status: resetRequest.success ? 'passed' : 'failed',
        statusCode: resetRequest.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test invalid email for reset
      const invalidResetRequest = await this.requestPasswordReset('nonexistent@example.com');
      results.push({
        flow: 'Password Reset',
        test: 'Invalid Email Reset Request',
        status: !invalidResetRequest.success ? 'passed' : 'failed',
        statusCode: invalidResetRequest.statusCode,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      results.push({
        flow: 'Password Reset',
        test: 'Password Reset',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        statusCode: response.status,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test token refresh flow
   */
  async testTokenRefresh() {
    const results = [];
    
    try {
      // First login to get tokens
      const loginResult = await this.attemptLogin(this.testUsers.valid.email, this.testUsers.valid.password);
      
      if (loginResult.success && loginResult.data.refresh_token) {
        const refreshToken = loginResult.data.refresh_token;
        
        // Test token refresh
        const refreshResult = await this.refreshToken(refreshToken);
        results.push({
          flow: 'Token Refresh',
          test: 'Token Refresh',
          status: refreshResult.success ? 'passed' : 'failed',
          statusCode: refreshResult.statusCode,
          timestamp: new Date().toISOString()
        });

        // Test invalid refresh token
        const invalidRefreshResult = await this.refreshToken('invalid.refresh.token');
        results.push({
          flow: 'Token Refresh',
          test: 'Invalid Refresh Token',
          status: !invalidRefreshResult.success ? 'passed' : 'failed',
          statusCode: invalidRefreshResult.statusCode,
          timestamp: new Date().toISOString()
        });
      } else {
        results.push({
          flow: 'Token Refresh',
          test: 'Token Refresh',
          status: 'skipped',
          reason: 'No refresh token available',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      results.push({
        flow: 'Token Refresh',
        test: 'Token Refresh',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        statusCode: response.status,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanup() {
    // Clean up test environment
    await AsyncStorage.clear();
  }
}

export default AuthTester;