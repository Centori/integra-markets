# DivergenceApi

All URIs are relative to *https://api.integramarkets.app*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getDivergence**](DivergenceApi.md#getdivergence) | **GET** /v1/markets/divergence | Divergence Batch |
| [**getDivergenceForTopic**](DivergenceApi.md#getdivergencefortopic) | **GET** /v1/markets/divergence/{topic} | Divergence For Topic |
| [**listTopics**](DivergenceApi.md#listtopics) | **GET** /v1/topics | List Topics |



## getDivergence

> object getDivergence(topics, threshold, lookbackHours, authorization)

Divergence Batch

Batch divergence — useful for the dashboard / scanner views.

### Example

```ts
import {
  Configuration,
  DivergenceApi,
} from '@integra-markets/sdk';
import type { GetDivergenceRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DivergenceApi(config);

  const body = {
    // string | Comma-separated topic keys (max 10)
    topics: topics_example,
    // number (optional)
    threshold: 8.14,
    // number (optional)
    lookbackHours: 56,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetDivergenceRequest;

  try {
    const data = await api.getDivergence(body);
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
| **topics** | `string` | Comma-separated topic keys (max 10) | [Defaults to `undefined`] |
| **threshold** | `number` |  | [Optional] [Defaults to `0.2`] |
| **lookbackHours** | `number` |  | [Optional] [Defaults to `24`] |
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


## getDivergenceForTopic

> object getDivergenceForTopic(topic, threshold, lookbackHours, authorization)

Divergence For Topic

News sentiment vs. prediction-market consensus for one topic.

### Example

```ts
import {
  Configuration,
  DivergenceApi,
} from '@integra-markets/sdk';
import type { GetDivergenceForTopicRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DivergenceApi(config);

  const body = {
    // string
    topic: topic_example,
    // number (optional)
    threshold: 8.14,
    // number (optional)
    lookbackHours: 56,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetDivergenceForTopicRequest;

  try {
    const data = await api.getDivergenceForTopic(body);
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
| **topic** | `string` |  | [Defaults to `undefined`] |
| **threshold** | `number` |  | [Optional] [Defaults to `0.2`] |
| **lookbackHours** | `number` |  | [Optional] [Defaults to `24`] |
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


## listTopics

> object listTopics(authorization)

List Topics

All topics + categories Integra tracks for divergence.

### Example

```ts
import {
  Configuration,
  DivergenceApi,
} from '@integra-markets/sdk';
import type { ListTopicsRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DivergenceApi(config);

  const body = {
    // string (optional)
    authorization: authorization_example,
  } satisfies ListTopicsRequest;

  try {
    const data = await api.listTopics(body);
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

