# PublicV1Api

All URIs are relative to *https://api.integramarkets.app*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**findHistoricalAnalogs**](PublicV1Api.md#findhistoricalanalogs) | **GET** /v1/historical/analogs | Historical Analogs |
| [**getBrief**](PublicV1Api.md#getbrief) | **GET** /v1/brief | Brief |
| [**getNarratives**](PublicV1Api.md#getnarratives) | **GET** /v1/narratives | Narratives |
| [**getSentiment**](PublicV1Api.md#getsentiment) | **GET** /v1/sentiment | Sentiment |



## findHistoricalAnalogs

> object findHistoricalAnalogs(commodity, event, n, authorization)

Historical Analogs

### Example

```ts
import {
  Configuration,
  PublicV1Api,
} from '@integra-markets/sdk';
import type { FindHistoricalAnalogsRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PublicV1Api(config);

  const body = {
    // string
    commodity: commodity_example,
    // string | Free-text description of the current setup
    event: event_example,
    // number (optional)
    n: 56,
    // string (optional)
    authorization: authorization_example,
  } satisfies FindHistoricalAnalogsRequest;

  try {
    const data = await api.findHistoricalAnalogs(body);
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
| **commodity** | `string` |  | [Defaults to `undefined`] |
| **event** | `string` | Free-text description of the current setup | [Defaults to `undefined`] |
| **n** | `number` |  | [Optional] [Defaults to `5`] |
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


## getBrief

> object getBrief(commodity, authorization)

Brief

Composite briefing: 7d + 30d sentiment, top narratives, key divergences.  Composed from the same underlying data as the individual endpoints — one request instead of four so the MCP client can pull a full snapshot for Claude with minimum roundtrips.

### Example

```ts
import {
  Configuration,
  PublicV1Api,
} from '@integra-markets/sdk';
import type { GetBriefRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PublicV1Api(config);

  const body = {
    // string | Commodity ticker
    commodity: commodity_example,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetBriefRequest;

  try {
    const data = await api.getBrief(body);
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
| **commodity** | `string` | Commodity ticker | [Defaults to `undefined`] |
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


## getNarratives

> object getNarratives(commodity, lookback, authorization)

Narratives

Emerging themes derived from clustering recent article headlines.  Beta shape: groups articles by shared keyword stems in the headline and returns the top clusters with average sentiment. A dedicated topic-model service will replace this stem-clustering approach once we have training data volume to justify it.

### Example

```ts
import {
  Configuration,
  PublicV1Api,
} from '@integra-markets/sdk';
import type { GetNarrativesRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PublicV1Api(config);

  const body = {
    // string | Commodity ticker
    commodity: commodity_example,
    // string | One of 24h, 7d, 30d (optional)
    lookback: lookback_example,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetNarrativesRequest;

  try {
    const data = await api.getNarratives(body);
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
| **commodity** | `string` | Commodity ticker | [Defaults to `undefined`] |
| **lookback** | `string` | One of 24h, 7d, 30d | [Optional] [Defaults to `&#39;7d&#39;`] |
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


## getSentiment

> object getSentiment(commodity, window, authorization)

Sentiment

### Example

```ts
import {
  Configuration,
  PublicV1Api,
} from '@integra-markets/sdk';
import type { GetSentimentRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PublicV1Api(config);

  const body = {
    // string | Commodity ticker, e.g. \'brent\'
    commodity: commodity_example,
    // string | One of 24h, 7d, 30d, 90d (optional)
    window: window_example,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetSentimentRequest;

  try {
    const data = await api.getSentiment(body);
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
| **commodity** | `string` | Commodity ticker, e.g. \&#39;brent\&#39; | [Defaults to `undefined`] |
| **window** | `string` | One of 24h, 7d, 30d, 90d | [Optional] [Defaults to `&#39;7d&#39;`] |
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

