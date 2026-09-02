# SentimentHistoryApi

All URIs are relative to *https://api.integramarkets.app*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getMarketOverlay**](SentimentHistoryApi.md#getmarketoverlay) | **GET** /v1/markets/overlay | Markets Overlay |
| [**getSentimentDaily**](SentimentHistoryApi.md#getsentimentdaily) | **GET** /v1/sentiment/{commodity}/daily | Sentiment Daily |
| [**getSentimentHistory**](SentimentHistoryApi.md#getsentimenthistory) | **GET** /v1/sentiment/{commodity}/history | Sentiment History |
| [**getSentimentNow**](SentimentHistoryApi.md#getsentimentnow) | **GET** /v1/sentiment/{commodity}/now | Sentiment Now |
| [**listCommodities**](SentimentHistoryApi.md#listcommodities) | **GET** /v1/commodities | List Commodities |



## getMarketOverlay

> object getMarketOverlay(provider, status, limit, authorization)

Markets Overlay

Resolved prediction markets with linked news-sentiment context.  For the beta this returns the resolved markets enriched with the average news sentiment over the market\&#39;s lifetime. Full per-snapshot overlay arrives once the nightly aggregation job is wired up; this endpoint already returns the shape that job will populate.

### Example

```ts
import {
  Configuration,
  SentimentHistoryApi,
} from '@integra-markets/sdk';
import type { GetMarketOverlayRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SentimentHistoryApi(config);

  const body = {
    // string (optional)
    provider: provider_example,
    // string | market status filter applied to raw_payload (optional)
    status: status_example,
    // number (optional)
    limit: 56,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetMarketOverlayRequest;

  try {
    const data = await api.getMarketOverlay(body);
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
| **provider** | `string` |  | [Optional] [Defaults to `&#39;kalshi&#39;`] |
| **status** | `string` | market status filter applied to raw_payload | [Optional] [Defaults to `&#39;settled&#39;`] |
| **limit** | `number` |  | [Optional] [Defaults to `50`] |
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


## getSentimentDaily

> object getSentimentDaily(commodity, days, authorization)

Sentiment Daily

Daily aggregates for the last N days, computed on-the-fly.

### Example

```ts
import {
  Configuration,
  SentimentHistoryApi,
} from '@integra-markets/sdk';
import type { GetSentimentDailyRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SentimentHistoryApi(config);

  const body = {
    // string
    commodity: commodity_example,
    // number (optional)
    days: 56,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetSentimentDailyRequest;

  try {
    const data = await api.getSentimentDaily(body);
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
| **days** | `number` |  | [Optional] [Defaults to `30`] |
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


## getSentimentHistory

> object getSentimentHistory(commodity, from, to, limit, authorization)

Sentiment History

Time-series of individual scored documents for &#x60;commodity&#x60;.

### Example

```ts
import {
  Configuration,
  SentimentHistoryApi,
} from '@integra-markets/sdk';
import type { GetSentimentHistoryRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SentimentHistoryApi(config);

  const body = {
    // string
    commodity: commodity_example,
    // string | ISO 8601 UTC timestamp (optional)
    from: from_example,
    // string | ISO 8601 UTC timestamp (optional)
    to: to_example,
    // number (optional)
    limit: 56,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetSentimentHistoryRequest;

  try {
    const data = await api.getSentimentHistory(body);
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
| **from** | `string` | ISO 8601 UTC timestamp | [Optional] [Defaults to `undefined`] |
| **to** | `string` | ISO 8601 UTC timestamp | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |
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


## getSentimentNow

> object getSentimentNow(commodity, authorization)

Sentiment Now

Most recent observed sentiment for &#x60;commodity&#x60; plus a 24h rolling stat.

### Example

```ts
import {
  Configuration,
  SentimentHistoryApi,
} from '@integra-markets/sdk';
import type { GetSentimentNowRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SentimentHistoryApi(config);

  const body = {
    // string
    commodity: commodity_example,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetSentimentNowRequest;

  try {
    const data = await api.getSentimentNow(body);
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


## listCommodities

> object listCommodities(authorization)

List Commodities

Return distinct commodities that have at least one scored document.

### Example

```ts
import {
  Configuration,
  SentimentHistoryApi,
} from '@integra-markets/sdk';
import type { ListCommoditiesRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SentimentHistoryApi(config);

  const body = {
    // string (optional)
    authorization: authorization_example,
  } satisfies ListCommoditiesRequest;

  try {
    const data = await api.listCommodities(body);
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

