# AgentApi

All URIs are relative to *https://api.integramarkets.app*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**askAgent**](AgentApi.md#askagent) | **POST** /v1/agent/ask | Ask |
| [**listAgentTemplates**](AgentApi.md#listagenttemplates) | **GET** /v1/agent/templates | List Templates |



## askAgent

> AskResponse askAgent(askRequest, authorization)

Ask

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '@integra-markets/sdk';
import type { AskAgentRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AgentApi(config);

  const body = {
    // AskRequest
    askRequest: ...,
    // string (optional)
    authorization: authorization_example,
  } satisfies AskAgentRequest;

  try {
    const data = await api.askAgent(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **askRequest** | [AskRequest](AskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AskResponse**](AskResponse.md)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listAgentTemplates

> object listAgentTemplates(authorization)

List Templates

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '@integra-markets/sdk';
import type { ListAgentTemplatesRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AgentApi(config);

  const body = {
    // string (optional)
    authorization: authorization_example,
  } satisfies ListAgentTemplatesRequest;

  try {
    const data = await api.listAgentTemplates(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**object**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

