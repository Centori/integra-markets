# @integra-markets/sdk@0.1.0

A TypeScript SDK client for the api.integramarkets.app API.

## Usage

First, install the SDK from npm.

```bash
npm install @integra-markets/sdk --save
```

Next, try it out.


```ts
import {
  Configuration,
  ApiKeysApi,
} from '@integra-markets/sdk';
import type { CreateKeyApiKeysPostRequest } from '@integra-markets/sdk';

async function example() {
  console.log("🚀 Testing @integra-markets/sdk SDK...");
  const api = new ApiKeysApi();

  const body = {
    // CreateKeyRequest
    createKeyRequest: ...,
  } satisfies CreateKeyApiKeysPostRequest;

  try {
    const data = await api.createKeyApiKeysPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```


## Documentation

### API Endpoints

All URIs are relative to *https://api.integramarkets.app*

| Class | Method | HTTP request | Description
| ----- | ------ | ------------ | -------------
*ApiKeysApi* | [**createKeyApiKeysPost**](docs/ApiKeysApi.md#createkeyapikeyspost) | **POST** /api/keys | Create Key
*ApiKeysApi* | [**listKeysApiKeysGet**](docs/ApiKeysApi.md#listkeysapikeysget) | **GET** /api/keys | List Keys
*ApiKeysApi* | [**revokeKeyApiKeysKeyIdDelete**](docs/ApiKeysApi.md#revokekeyapikeyskeyiddelete) | **DELETE** /api/keys/{key_id} | Revoke Key
*DefaultApi* | [**aiAnalyzeAiAnalyzePost**](docs/DefaultApi.md#aianalyzeaianalyzepost) | **POST** /ai/analyze | Ai Analyze
*DefaultApi* | [**aiChatAiChatPost**](docs/DefaultApi.md#aichataichatpost) | **POST** /ai/chat | Ai Chat
*DefaultApi* | [**analyzeNewsApiNewsAnalysisPost**](docs/DefaultApi.md#analyzenewsapinewsanalysispost) | **POST** /api/news/analysis | Analyze News
*DefaultApi* | [**analyzeSentimentApiSentimentPost**](docs/DefaultApi.md#analyzesentimentapisentimentpost) | **POST** /api/sentiment | Analyze Sentiment
*DefaultApi* | [**analyzeSentimentLegacyAnalyzeSentimentPost**](docs/DefaultApi.md#analyzesentimentlegacyanalyzesentimentpost) | **POST** /analyze-sentiment | Analyze Sentiment Legacy
*DefaultApi* | [**comprehensiveAnalysisApiComprehensiveAnalysisPost**](docs/DefaultApi.md#comprehensiveanalysisapicomprehensiveanalysispost) | **POST** /api/comprehensive-analysis | Comprehensive Analysis
*DefaultApi* | [**createPolymarketConnectorApiPredictionMarketConnectorsPolymarketPost**](docs/DefaultApi.md#createpolymarketconnectorapipredictionmarketconnectorspolymarketpost) | **POST** /api/prediction-market/connectors/polymarket | Create Polymarket Connector
*DefaultApi* | [**deletePolymarketConnectorApiPredictionMarketConnectorsPolymarketConnectorIdDelete**](docs/DefaultApi.md#deletepolymarketconnectorapipredictionmarketconnectorspolymarketconnectoriddelete) | **DELETE** /api/prediction-market/connectors/polymarket/{connector_id} | Delete Polymarket Connector
*DefaultApi* | [**explainCommodityLexiconApiLexiconExplainPost**](docs/DefaultApi.md#explaincommoditylexiconapilexiconexplainpost) | **POST** /api/lexicon/explain | Explain Commodity Lexicon
*DefaultApi* | [**generateAiReportAiReportPost**](docs/DefaultApi.md#generateaireportaireportpost) | **POST** /ai/report | Generate Ai Report
*DefaultApi* | [**getCommodityLexiconCatalogApiLexiconCommoditiesGet**](docs/DefaultApi.md#getcommoditylexiconcatalogapilexiconcommoditiesget) | **GET** /api/lexicon/commodities | Get Commodity Lexicon Catalog
*DefaultApi* | [**getCommodityLexiconDetailApiLexiconCommoditiesCommodityGet**](docs/DefaultApi.md#getcommoditylexicondetailapilexiconcommoditiescommodityget) | **GET** /api/lexicon/commodities/{commodity} | Get Commodity Lexicon Detail
*DefaultApi* | [**getDashboardSentimentEngineApiDashboardSentimentEnginePost**](docs/DefaultApi.md#getdashboardsentimentengineapidashboardsentimentenginepost) | **POST** /api/dashboard/sentiment-engine | Get Dashboard Sentiment Engine
*DefaultApi* | [**getMarketSentimentApiSentimentMarketGet**](docs/DefaultApi.md#getmarketsentimentapisentimentmarketget) | **GET** /api/sentiment/market | Get Market Sentiment
*DefaultApi* | [**getModelsStatusApiModelsStatusGet**](docs/DefaultApi.md#getmodelsstatusapimodelsstatusget) | **GET** /api/models/status | Get Models Status
*DefaultApi* | [**getNewsFeedApiNewsFeedPost**](docs/DefaultApi.md#getnewsfeedapinewsfeedpost) | **POST** /api/news/feed | Get News Feed
*DefaultApi* | [**getOverallNewsSentimentApiNewsOverallSentimentPost**](docs/DefaultApi.md#getoverallnewssentimentapinewsoverallsentimentpost) | **POST** /api/news/overall-sentiment | Get Overall News Sentiment
*DefaultApi* | [**getPolymarketConnectorSentimentApiPredictionMarketPolymarketSentimentPost**](docs/DefaultApi.md#getpolymarketconnectorsentimentapipredictionmarketpolymarketsentimentpost) | **POST** /api/prediction-market/polymarket/sentiment | Get Polymarket Connector Sentiment
*DefaultApi* | [**getTopMoversApiSentimentMoversGet**](docs/DefaultApi.md#gettopmoversapisentimentmoversget) | **GET** /api/sentiment/movers | Get Top Movers
*DefaultApi* | [**getUserNewsApiUserNewsPost**](docs/DefaultApi.md#getusernewsapiusernewspost) | **POST** /api/user/news | Get User News
*DefaultApi* | [**getWeatherAlertsApiWeatherAlertsGet**](docs/DefaultApi.md#getweatheralertsapiweatheralertsget) | **GET** /api/weather/alerts | Get Weather Alerts
*DefaultApi* | [**healthCheckHealthGet**](docs/DefaultApi.md#healthcheckhealthget) | **GET** /health | Health Check
*DefaultApi* | [**listPolymarketConnectorsApiPredictionMarketConnectorsPolymarketUserIdGet**](docs/DefaultApi.md#listpolymarketconnectorsapipredictionmarketconnectorspolymarketuseridget) | **GET** /api/prediction-market/connectors/polymarket/{user_id} | List Polymarket Connectors
*DefaultApi* | [**readRootGet**](docs/DefaultApi.md#readrootget) | **GET** / | Read Root
*DefaultApi* | [**summarizeArticleApiSummarizeArticlePost**](docs/DefaultApi.md#summarizearticleapisummarizearticlepost) | **POST** /api/summarize/article | Summarize Article
*DefaultApi* | [**testNewsEndpointApiTestNewsGet**](docs/DefaultApi.md#testnewsendpointapitestnewsget) | **GET** /api/test/news | Test News Endpoint
*DefaultApi* | [**validatePolymarketConnectorApiPredictionMarketConnectorsPolymarketValidatePost**](docs/DefaultApi.md#validatepolymarketconnectorapipredictionmarketconnectorspolymarketvalidatepost) | **POST** /api/prediction-market/connectors/polymarket/validate | Validate Polymarket Connector


### Models

- [AIAnalysisRequest](docs/AIAnalysisRequest.md)
- [AIChatRequest](docs/AIChatRequest.md)
- [ArticleSummarizeRequest](docs/ArticleSummarizeRequest.md)
- [ComprehensiveAnalysisRequest](docs/ComprehensiveAnalysisRequest.md)
- [ConnectorCredentialRequest](docs/ConnectorCredentialRequest.md)
- [CreateKeyRequest](docs/CreateKeyRequest.md)
- [CreateKeyResponse](docs/CreateKeyResponse.md)
- [DashboardSentimentEngineRequest](docs/DashboardSentimentEngineRequest.md)
- [HTTPValidationError](docs/HTTPValidationError.md)
- [KeyRow](docs/KeyRow.md)
- [LexiconExplainRequest](docs/LexiconExplainRequest.md)
- [LocationInner](docs/LocationInner.md)
- [NewsAnalysisRequest](docs/NewsAnalysisRequest.md)
- [NewsRequest](docs/NewsRequest.md)
- [OverallSentimentRequest](docs/OverallSentimentRequest.md)
- [PolymarketAuthenticationMeta](docs/PolymarketAuthenticationMeta.md)
- [PolymarketConnectorAuthSummary](docs/PolymarketConnectorAuthSummary.md)
- [PolymarketConnectorContext](docs/PolymarketConnectorContext.md)
- [PolymarketConnectorRequest](docs/PolymarketConnectorRequest.md)
- [PolymarketConnectorValidationRequest](docs/PolymarketConnectorValidationRequest.md)
- [PolymarketSentimentRequest](docs/PolymarketSentimentRequest.md)
- [PolymarketSentimentResponse](docs/PolymarketSentimentResponse.md)
- [SentimentBreakdown](docs/SentimentBreakdown.md)
- [SentimentRequest](docs/SentimentRequest.md)
- [UserNewsRequest](docs/UserNewsRequest.md)
- [ValidationError](docs/ValidationError.md)

### Authorization

Endpoints do not require authorization.


## About

This TypeScript SDK client supports the [Fetch API](https://fetch.spec.whatwg.org/)
and is automatically generated by the
[OpenAPI Generator](https://openapi-generator.tech) project:

- API version: `0.1.0`
- Package version: `0.1.0`
- Generator version: `7.22.0`
- Build package: `org.openapitools.codegen.languages.TypeScriptFetchClientCodegen`

The generated npm module supports the following:

- Environments
  * Node.js
  * Webpack
  * Browserify
- Language levels
  * ES5 - you must have a Promises/A+ library installed
  * ES6
- Module systems
  * CommonJS
  * ES6 module system


## Development

### Building

To build the TypeScript source code, you need to have Node.js and npm installed.
After cloning the repository, navigate to the project directory and run:

```bash
npm install
npm run build
```

### Publishing

Once you've built the package, you can publish it to npm:

```bash
npm publish
```

## License

[]()
