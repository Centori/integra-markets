# ExportApi

All URIs are relative to *https://api.integramarkets.app*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**exportSentiment**](ExportApi.md#exportsentiment) | **GET** /v1/export/sentiment | Export Sentiment |



## exportSentiment

> any exportSentiment(commodity, from, to, format, authorization)

Export Sentiment

Bulk-export scored sentiment rows as CSV or XLSX.

### Example

```ts
import {
  Configuration,
  ExportApi,
} from '@integra-markets/sdk';
import type { ExportSentimentRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: ApiKeyAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ExportApi(config);

  const body = {
    // string | Commodity or topic key, e.g. crude_oil
    commodity: commodity_example,
    // string | ISO 8601 UTC (optional)
    from: from_example,
    // string | ISO 8601 UTC (optional)
    to: to_example,
    // string (optional)
    format: format_example,
    // string (optional)
    authorization: authorization_example,
  } satisfies ExportSentimentRequest;

  try {
    const data = await api.exportSentiment(body);
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
| **commodity** | `string` | Commodity or topic key, e.g. crude_oil | [Defaults to `undefined`] |
| **from** | `string` | ISO 8601 UTC | [Optional] [Defaults to `undefined`] |
| **to** | `string` | ISO 8601 UTC | [Optional] [Defaults to `undefined`] |
| **format** | `string` |  | [Optional] [Defaults to `&#39;csv&#39;`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**any**

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

