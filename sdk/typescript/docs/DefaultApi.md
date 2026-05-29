# DefaultApi

All URIs are relative to *https://api.integramarkets.app*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**aiAnalyzeAiAnalyzePost**](DefaultApi.md#aianalyzeaianalyzepost) | **POST** /ai/analyze | Ai Analyze |
| [**aiChatAiChatPost**](DefaultApi.md#aichataichatpost) | **POST** /ai/chat | Ai Chat |
| [**analyzeNewsApiNewsAnalysisPost**](DefaultApi.md#analyzenewsapinewsanalysispost) | **POST** /api/news/analysis | Analyze News |
| [**analyzeSentimentApiSentimentPost**](DefaultApi.md#analyzesentimentapisentimentpost) | **POST** /api/sentiment | Analyze Sentiment |
| [**analyzeSentimentLegacyAnalyzeSentimentPost**](DefaultApi.md#analyzesentimentlegacyanalyzesentimentpost) | **POST** /analyze-sentiment | Analyze Sentiment Legacy |
| [**comprehensiveAnalysisApiComprehensiveAnalysisPost**](DefaultApi.md#comprehensiveanalysisapicomprehensiveanalysispost) | **POST** /api/comprehensive-analysis | Comprehensive Analysis |
| [**createPolymarketConnectorApiPredictionMarketConnectorsPolymarketPost**](DefaultApi.md#createpolymarketconnectorapipredictionmarketconnectorspolymarketpost) | **POST** /api/prediction-market/connectors/polymarket | Create Polymarket Connector |
| [**deletePolymarketConnectorApiPredictionMarketConnectorsPolymarketConnectorIdDelete**](DefaultApi.md#deletepolymarketconnectorapipredictionmarketconnectorspolymarketconnectoriddelete) | **DELETE** /api/prediction-market/connectors/polymarket/{connector_id} | Delete Polymarket Connector |
| [**explainCommodityLexiconApiLexiconExplainPost**](DefaultApi.md#explaincommoditylexiconapilexiconexplainpost) | **POST** /api/lexicon/explain | Explain Commodity Lexicon |
| [**generateAiReportAiReportPost**](DefaultApi.md#generateaireportaireportpost) | **POST** /ai/report | Generate Ai Report |
| [**getCommodityLexiconCatalogApiLexiconCommoditiesGet**](DefaultApi.md#getcommoditylexiconcatalogapilexiconcommoditiesget) | **GET** /api/lexicon/commodities | Get Commodity Lexicon Catalog |
| [**getCommodityLexiconDetailApiLexiconCommoditiesCommodityGet**](DefaultApi.md#getcommoditylexicondetailapilexiconcommoditiescommodityget) | **GET** /api/lexicon/commodities/{commodity} | Get Commodity Lexicon Detail |
| [**getDashboardSentimentEngineApiDashboardSentimentEnginePost**](DefaultApi.md#getdashboardsentimentengineapidashboardsentimentenginepost) | **POST** /api/dashboard/sentiment-engine | Get Dashboard Sentiment Engine |
| [**getMarketSentimentApiSentimentMarketGet**](DefaultApi.md#getmarketsentimentapisentimentmarketget) | **GET** /api/sentiment/market | Get Market Sentiment |
| [**getModelsStatusApiModelsStatusGet**](DefaultApi.md#getmodelsstatusapimodelsstatusget) | **GET** /api/models/status | Get Models Status |
| [**getNewsFeedApiNewsFeedPost**](DefaultApi.md#getnewsfeedapinewsfeedpost) | **POST** /api/news/feed | Get News Feed |
| [**getOverallNewsSentimentApiNewsOverallSentimentPost**](DefaultApi.md#getoverallnewssentimentapinewsoverallsentimentpost) | **POST** /api/news/overall-sentiment | Get Overall News Sentiment |
| [**getPolymarketConnectorSentimentApiPredictionMarketPolymarketSentimentPost**](DefaultApi.md#getpolymarketconnectorsentimentapipredictionmarketpolymarketsentimentpost) | **POST** /api/prediction-market/polymarket/sentiment | Get Polymarket Connector Sentiment |
| [**getTopMoversApiSentimentMoversGet**](DefaultApi.md#gettopmoversapisentimentmoversget) | **GET** /api/sentiment/movers | Get Top Movers |
| [**getUserNewsApiUserNewsPost**](DefaultApi.md#getusernewsapiusernewspost) | **POST** /api/user/news | Get User News |
| [**getWeatherAlertsApiWeatherAlertsGet**](DefaultApi.md#getweatheralertsapiweatheralertsget) | **GET** /api/weather/alerts | Get Weather Alerts |
| [**healthCheckHealthGet**](DefaultApi.md#healthcheckhealthget) | **GET** /health | Health Check |
| [**listPolymarketConnectorsApiPredictionMarketConnectorsPolymarketUserIdGet**](DefaultApi.md#listpolymarketconnectorsapipredictionmarketconnectorspolymarketuseridget) | **GET** /api/prediction-market/connectors/polymarket/{user_id} | List Polymarket Connectors |
| [**readRootGet**](DefaultApi.md#readrootget) | **GET** / | Read Root |
| [**summarizeArticleApiSummarizeArticlePost**](DefaultApi.md#summarizearticleapisummarizearticlepost) | **POST** /api/summarize/article | Summarize Article |
| [**testNewsEndpointApiTestNewsGet**](DefaultApi.md#testnewsendpointapitestnewsget) | **GET** /api/test/news | Test News Endpoint |
| [**validatePolymarketConnectorApiPredictionMarketConnectorsPolymarketValidatePost**](DefaultApi.md#validatepolymarketconnectorapipredictionmarketconnectorspolymarketvalidatepost) | **POST** /api/prediction-market/connectors/polymarket/validate | Validate Polymarket Connector |



## aiAnalyzeAiAnalyzePost

> any aiAnalyzeAiAnalyzePost(aIAnalysisRequest)

Ai Analyze

Perform AI analysis with reasoning and tools

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { AiAnalyzeAiAnalyzePostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // AIAnalysisRequest
    aIAnalysisRequest: ...,
  } satisfies AiAnalyzeAiAnalyzePostRequest;

  try {
    const data = await api.aiAnalyzeAiAnalyzePost(body);
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
| **aIAnalysisRequest** | [AIAnalysisRequest](AIAnalysisRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## aiChatAiChatPost

> any aiChatAiChatPost(aIChatRequest)

Ai Chat

Chat with AI using tool capabilities

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { AiChatAiChatPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // AIChatRequest
    aIChatRequest: ...,
  } satisfies AiChatAiChatPostRequest;

  try {
    const data = await api.aiChatAiChatPost(body);
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
| **aIChatRequest** | [AIChatRequest](AIChatRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## analyzeNewsApiNewsAnalysisPost

> any analyzeNewsApiNewsAnalysisPost(newsAnalysisRequest)

Analyze News

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { AnalyzeNewsApiNewsAnalysisPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // NewsAnalysisRequest
    newsAnalysisRequest: ...,
  } satisfies AnalyzeNewsApiNewsAnalysisPostRequest;

  try {
    const data = await api.analyzeNewsApiNewsAnalysisPost(body);
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
| **newsAnalysisRequest** | [NewsAnalysisRequest](NewsAnalysisRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## analyzeSentimentApiSentimentPost

> any analyzeSentimentApiSentimentPost(sentimentRequest)

Analyze Sentiment

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { AnalyzeSentimentApiSentimentPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // SentimentRequest
    sentimentRequest: ...,
  } satisfies AnalyzeSentimentApiSentimentPostRequest;

  try {
    const data = await api.analyzeSentimentApiSentimentPost(body);
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
| **sentimentRequest** | [SentimentRequest](SentimentRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## analyzeSentimentLegacyAnalyzeSentimentPost

> any analyzeSentimentLegacyAnalyzeSentimentPost(sentimentRequest)

Analyze Sentiment Legacy

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { AnalyzeSentimentLegacyAnalyzeSentimentPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // SentimentRequest
    sentimentRequest: ...,
  } satisfies AnalyzeSentimentLegacyAnalyzeSentimentPostRequest;

  try {
    const data = await api.analyzeSentimentLegacyAnalyzeSentimentPost(body);
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
| **sentimentRequest** | [SentimentRequest](SentimentRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## comprehensiveAnalysisApiComprehensiveAnalysisPost

> any comprehensiveAnalysisApiComprehensiveAnalysisPost(comprehensiveAnalysisRequest)

Comprehensive Analysis

Perform comprehensive analysis with preprocessing and trigger keywords

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { ComprehensiveAnalysisApiComprehensiveAnalysisPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // ComprehensiveAnalysisRequest
    comprehensiveAnalysisRequest: ...,
  } satisfies ComprehensiveAnalysisApiComprehensiveAnalysisPostRequest;

  try {
    const data = await api.comprehensiveAnalysisApiComprehensiveAnalysisPost(body);
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
| **comprehensiveAnalysisRequest** | [ComprehensiveAnalysisRequest](ComprehensiveAnalysisRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createPolymarketConnectorApiPredictionMarketConnectorsPolymarketPost

> any createPolymarketConnectorApiPredictionMarketConnectorsPolymarketPost(polymarketConnectorRequest)

Create Polymarket Connector

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { CreatePolymarketConnectorApiPredictionMarketConnectorsPolymarketPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // PolymarketConnectorRequest
    polymarketConnectorRequest: ...,
  } satisfies CreatePolymarketConnectorApiPredictionMarketConnectorsPolymarketPostRequest;

  try {
    const data = await api.createPolymarketConnectorApiPredictionMarketConnectorsPolymarketPost(body);
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
| **polymarketConnectorRequest** | [PolymarketConnectorRequest](PolymarketConnectorRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deletePolymarketConnectorApiPredictionMarketConnectorsPolymarketConnectorIdDelete

> any deletePolymarketConnectorApiPredictionMarketConnectorsPolymarketConnectorIdDelete(connectorId, userId)

Delete Polymarket Connector

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { DeletePolymarketConnectorApiPredictionMarketConnectorsPolymarketConnectorIdDeleteRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    connectorId: connectorId_example,
    // string (optional)
    userId: userId_example,
  } satisfies DeletePolymarketConnectorApiPredictionMarketConnectorsPolymarketConnectorIdDeleteRequest;

  try {
    const data = await api.deletePolymarketConnectorApiPredictionMarketConnectorsPolymarketConnectorIdDelete(body);
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
| **connectorId** | `string` |  | [Defaults to `undefined`] |
| **userId** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## explainCommodityLexiconApiLexiconExplainPost

> any explainCommodityLexiconApiLexiconExplainPost(lexiconExplainRequest)

Explain Commodity Lexicon

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { ExplainCommodityLexiconApiLexiconExplainPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // LexiconExplainRequest
    lexiconExplainRequest: ...,
  } satisfies ExplainCommodityLexiconApiLexiconExplainPostRequest;

  try {
    const data = await api.explainCommodityLexiconApiLexiconExplainPost(body);
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
| **lexiconExplainRequest** | [LexiconExplainRequest](LexiconExplainRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## generateAiReportAiReportPost

> any generateAiReportAiReportPost(includePredictions, includeNews, requestBody)

Generate Ai Report

Generate comprehensive AI market report

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GenerateAiReportAiReportPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // boolean (optional)
    includePredictions: true,
    // boolean (optional)
    includeNews: true,
    // Array<string | null> (optional)
    requestBody: ...,
  } satisfies GenerateAiReportAiReportPostRequest;

  try {
    const data = await api.generateAiReportAiReportPost(body);
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
| **includePredictions** | `boolean` |  | [Optional] [Defaults to `true`] |
| **includeNews** | `boolean` |  | [Optional] [Defaults to `true`] |
| **requestBody** | `Array<string | null>` |  | [Optional] |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getCommodityLexiconCatalogApiLexiconCommoditiesGet

> any getCommodityLexiconCatalogApiLexiconCommoditiesGet()

Get Commodity Lexicon Catalog

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetCommodityLexiconCatalogApiLexiconCommoditiesGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getCommodityLexiconCatalogApiLexiconCommoditiesGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getCommodityLexiconDetailApiLexiconCommoditiesCommodityGet

> any getCommodityLexiconDetailApiLexiconCommoditiesCommodityGet(commodity)

Get Commodity Lexicon Detail

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetCommodityLexiconDetailApiLexiconCommoditiesCommodityGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    commodity: commodity_example,
  } satisfies GetCommodityLexiconDetailApiLexiconCommoditiesCommodityGetRequest;

  try {
    const data = await api.getCommodityLexiconDetailApiLexiconCommoditiesCommodityGet(body);
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

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDashboardSentimentEngineApiDashboardSentimentEnginePost

> any getDashboardSentimentEngineApiDashboardSentimentEnginePost(dashboardSentimentEngineRequest)

Get Dashboard Sentiment Engine

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetDashboardSentimentEngineApiDashboardSentimentEnginePostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // DashboardSentimentEngineRequest
    dashboardSentimentEngineRequest: ...,
  } satisfies GetDashboardSentimentEngineApiDashboardSentimentEnginePostRequest;

  try {
    const data = await api.getDashboardSentimentEngineApiDashboardSentimentEnginePost(body);
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
| **dashboardSentimentEngineRequest** | [DashboardSentimentEngineRequest](DashboardSentimentEngineRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMarketSentimentApiSentimentMarketGet

> any getMarketSentimentApiSentimentMarketGet()

Get Market Sentiment

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetMarketSentimentApiSentimentMarketGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getMarketSentimentApiSentimentMarketGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getModelsStatusApiModelsStatusGet

> any getModelsStatusApiModelsStatusGet()

Get Models Status

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetModelsStatusApiModelsStatusGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getModelsStatusApiModelsStatusGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getNewsFeedApiNewsFeedPost

> any getNewsFeedApiNewsFeedPost(newsRequest)

Get News Feed

Fetch real news articles from multiple financial sources

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetNewsFeedApiNewsFeedPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // NewsRequest
    newsRequest: ...,
  } satisfies GetNewsFeedApiNewsFeedPostRequest;

  try {
    const data = await api.getNewsFeedApiNewsFeedPost(body);
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
| **newsRequest** | [NewsRequest](NewsRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getOverallNewsSentimentApiNewsOverallSentimentPost

> any getOverallNewsSentimentApiNewsOverallSentimentPost(overallSentimentRequest)

Get Overall News Sentiment

Aggregate the latest cached headlines into a market-level sentiment summary.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetOverallNewsSentimentApiNewsOverallSentimentPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // OverallSentimentRequest
    overallSentimentRequest: ...,
  } satisfies GetOverallNewsSentimentApiNewsOverallSentimentPostRequest;

  try {
    const data = await api.getOverallNewsSentimentApiNewsOverallSentimentPost(body);
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
| **overallSentimentRequest** | [OverallSentimentRequest](OverallSentimentRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getPolymarketConnectorSentimentApiPredictionMarketPolymarketSentimentPost

> PolymarketSentimentResponse getPolymarketConnectorSentimentApiPredictionMarketPolymarketSentimentPost(polymarketSentimentRequest)

Get Polymarket Connector Sentiment

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetPolymarketConnectorSentimentApiPredictionMarketPolymarketSentimentPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // PolymarketSentimentRequest
    polymarketSentimentRequest: ...,
  } satisfies GetPolymarketConnectorSentimentApiPredictionMarketPolymarketSentimentPostRequest;

  try {
    const data = await api.getPolymarketConnectorSentimentApiPredictionMarketPolymarketSentimentPost(body);
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
| **polymarketSentimentRequest** | [PolymarketSentimentRequest](PolymarketSentimentRequest.md) |  | |

### Return type

[**PolymarketSentimentResponse**](PolymarketSentimentResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getTopMoversApiSentimentMoversGet

> any getTopMoversApiSentimentMoversGet()

Get Top Movers

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetTopMoversApiSentimentMoversGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getTopMoversApiSentimentMoversGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getUserNewsApiUserNewsPost

> any getUserNewsApiUserNewsPost(userNewsRequest)

Get User News

Fetch personalized news based on user\&#39;s saved preferences in Supabase

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetUserNewsApiUserNewsPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // UserNewsRequest
    userNewsRequest: ...,
  } satisfies GetUserNewsApiUserNewsPostRequest;

  try {
    const data = await api.getUserNewsApiUserNewsPost(body);
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
| **userNewsRequest** | [UserNewsRequest](UserNewsRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getWeatherAlertsApiWeatherAlertsGet

> any getWeatherAlertsApiWeatherAlertsGet()

Get Weather Alerts

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { GetWeatherAlertsApiWeatherAlertsGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getWeatherAlertsApiWeatherAlertsGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## healthCheckHealthGet

> any healthCheckHealthGet()

Health Check

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { HealthCheckHealthGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.healthCheckHealthGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listPolymarketConnectorsApiPredictionMarketConnectorsPolymarketUserIdGet

> any listPolymarketConnectorsApiPredictionMarketConnectorsPolymarketUserIdGet(userId)

List Polymarket Connectors

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { ListPolymarketConnectorsApiPredictionMarketConnectorsPolymarketUserIdGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    userId: userId_example,
  } satisfies ListPolymarketConnectorsApiPredictionMarketConnectorsPolymarketUserIdGetRequest;

  try {
    const data = await api.listPolymarketConnectorsApiPredictionMarketConnectorsPolymarketUserIdGet(body);
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
| **userId** | `string` |  | [Defaults to `undefined`] |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## readRootGet

> any readRootGet()

Read Root

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { ReadRootGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.readRootGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## summarizeArticleApiSummarizeArticlePost

> any summarizeArticleApiSummarizeArticlePost(articleSummarizeRequest)

Summarize Article

Summarize a financial news article from URL

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { SummarizeArticleApiSummarizeArticlePostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // ArticleSummarizeRequest
    articleSummarizeRequest: ...,
  } satisfies SummarizeArticleApiSummarizeArticlePostRequest;

  try {
    const data = await api.summarizeArticleApiSummarizeArticlePost(body);
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
| **articleSummarizeRequest** | [ArticleSummarizeRequest](ArticleSummarizeRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## testNewsEndpointApiTestNewsGet

> any testNewsEndpointApiTestNewsGet()

Test News Endpoint

Test endpoint for news functionality

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { TestNewsEndpointApiTestNewsGetRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.testNewsEndpointApiTestNewsGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## validatePolymarketConnectorApiPredictionMarketConnectorsPolymarketValidatePost

> any validatePolymarketConnectorApiPredictionMarketConnectorsPolymarketValidatePost(polymarketConnectorValidationRequest)

Validate Polymarket Connector

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@integra-markets/sdk';
import type { ValidatePolymarketConnectorApiPredictionMarketConnectorsPolymarketValidatePostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new DefaultApi();

  const body = {
    // PolymarketConnectorValidationRequest
    polymarketConnectorValidationRequest: ...,
  } satisfies ValidatePolymarketConnectorApiPredictionMarketConnectorsPolymarketValidatePostRequest;

  try {
    const data = await api.validatePolymarketConnectorApiPredictionMarketConnectorsPolymarketValidatePost(body);
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
| **polymarketConnectorValidationRequest** | [PolymarketConnectorValidationRequest](PolymarketConnectorValidationRequest.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

