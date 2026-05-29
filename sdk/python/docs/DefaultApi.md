# integra_markets.DefaultApi

All URIs are relative to *https://api.integramarkets.app*

Method | HTTP request | Description
------------- | ------------- | -------------
[**ai_analyze_ai_analyze_post**](DefaultApi.md#ai_analyze_ai_analyze_post) | **POST** /ai/analyze | Ai Analyze
[**ai_chat_ai_chat_post**](DefaultApi.md#ai_chat_ai_chat_post) | **POST** /ai/chat | Ai Chat
[**analyze_news_api_news_analysis_post**](DefaultApi.md#analyze_news_api_news_analysis_post) | **POST** /api/news/analysis | Analyze News
[**analyze_sentiment_api_sentiment_post**](DefaultApi.md#analyze_sentiment_api_sentiment_post) | **POST** /api/sentiment | Analyze Sentiment
[**analyze_sentiment_legacy_analyze_sentiment_post**](DefaultApi.md#analyze_sentiment_legacy_analyze_sentiment_post) | **POST** /analyze-sentiment | Analyze Sentiment Legacy
[**comprehensive_analysis_api_comprehensive_analysis_post**](DefaultApi.md#comprehensive_analysis_api_comprehensive_analysis_post) | **POST** /api/comprehensive-analysis | Comprehensive Analysis
[**create_polymarket_connector_api_prediction_market_connectors_polymarket_post**](DefaultApi.md#create_polymarket_connector_api_prediction_market_connectors_polymarket_post) | **POST** /api/prediction-market/connectors/polymarket | Create Polymarket Connector
[**delete_polymarket_connector_api_prediction_market_connectors_polymarket_connector_id_delete**](DefaultApi.md#delete_polymarket_connector_api_prediction_market_connectors_polymarket_connector_id_delete) | **DELETE** /api/prediction-market/connectors/polymarket/{connector_id} | Delete Polymarket Connector
[**explain_commodity_lexicon_api_lexicon_explain_post**](DefaultApi.md#explain_commodity_lexicon_api_lexicon_explain_post) | **POST** /api/lexicon/explain | Explain Commodity Lexicon
[**generate_ai_report_ai_report_post**](DefaultApi.md#generate_ai_report_ai_report_post) | **POST** /ai/report | Generate Ai Report
[**get_commodity_lexicon_catalog_api_lexicon_commodities_get**](DefaultApi.md#get_commodity_lexicon_catalog_api_lexicon_commodities_get) | **GET** /api/lexicon/commodities | Get Commodity Lexicon Catalog
[**get_commodity_lexicon_detail_api_lexicon_commodities_commodity_get**](DefaultApi.md#get_commodity_lexicon_detail_api_lexicon_commodities_commodity_get) | **GET** /api/lexicon/commodities/{commodity} | Get Commodity Lexicon Detail
[**get_dashboard_sentiment_engine_api_dashboard_sentiment_engine_post**](DefaultApi.md#get_dashboard_sentiment_engine_api_dashboard_sentiment_engine_post) | **POST** /api/dashboard/sentiment-engine | Get Dashboard Sentiment Engine
[**get_market_sentiment_api_sentiment_market_get**](DefaultApi.md#get_market_sentiment_api_sentiment_market_get) | **GET** /api/sentiment/market | Get Market Sentiment
[**get_models_status_api_models_status_get**](DefaultApi.md#get_models_status_api_models_status_get) | **GET** /api/models/status | Get Models Status
[**get_news_feed_api_news_feed_post**](DefaultApi.md#get_news_feed_api_news_feed_post) | **POST** /api/news/feed | Get News Feed
[**get_overall_news_sentiment_api_news_overall_sentiment_post**](DefaultApi.md#get_overall_news_sentiment_api_news_overall_sentiment_post) | **POST** /api/news/overall-sentiment | Get Overall News Sentiment
[**get_polymarket_connector_sentiment_api_prediction_market_polymarket_sentiment_post**](DefaultApi.md#get_polymarket_connector_sentiment_api_prediction_market_polymarket_sentiment_post) | **POST** /api/prediction-market/polymarket/sentiment | Get Polymarket Connector Sentiment
[**get_top_movers_api_sentiment_movers_get**](DefaultApi.md#get_top_movers_api_sentiment_movers_get) | **GET** /api/sentiment/movers | Get Top Movers
[**get_user_news_api_user_news_post**](DefaultApi.md#get_user_news_api_user_news_post) | **POST** /api/user/news | Get User News
[**get_weather_alerts_api_weather_alerts_get**](DefaultApi.md#get_weather_alerts_api_weather_alerts_get) | **GET** /api/weather/alerts | Get Weather Alerts
[**health_check_health_get**](DefaultApi.md#health_check_health_get) | **GET** /health | Health Check
[**list_polymarket_connectors_api_prediction_market_connectors_polymarket_user_id_get**](DefaultApi.md#list_polymarket_connectors_api_prediction_market_connectors_polymarket_user_id_get) | **GET** /api/prediction-market/connectors/polymarket/{user_id} | List Polymarket Connectors
[**read_root_get**](DefaultApi.md#read_root_get) | **GET** / | Read Root
[**summarize_article_api_summarize_article_post**](DefaultApi.md#summarize_article_api_summarize_article_post) | **POST** /api/summarize/article | Summarize Article
[**test_news_endpoint_api_test_news_get**](DefaultApi.md#test_news_endpoint_api_test_news_get) | **GET** /api/test/news | Test News Endpoint
[**validate_polymarket_connector_api_prediction_market_connectors_polymarket_validate_post**](DefaultApi.md#validate_polymarket_connector_api_prediction_market_connectors_polymarket_validate_post) | **POST** /api/prediction-market/connectors/polymarket/validate | Validate Polymarket Connector


# **ai_analyze_ai_analyze_post**
> object ai_analyze_ai_analyze_post(ai_analysis_request)

Ai Analyze

Perform AI analysis with reasoning and tools

### Example


```python
import integra_markets
from integra_markets.models.ai_analysis_request import AIAnalysisRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    ai_analysis_request = integra_markets.AIAnalysisRequest() # AIAnalysisRequest | 

    try:
        # Ai Analyze
        api_response = api_instance.ai_analyze_ai_analyze_post(ai_analysis_request)
        print("The response of DefaultApi->ai_analyze_ai_analyze_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->ai_analyze_ai_analyze_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **ai_analysis_request** | [**AIAnalysisRequest**](AIAnalysisRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **ai_chat_ai_chat_post**
> object ai_chat_ai_chat_post(ai_chat_request)

Ai Chat

Chat with AI using tool capabilities

### Example


```python
import integra_markets
from integra_markets.models.ai_chat_request import AIChatRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    ai_chat_request = integra_markets.AIChatRequest() # AIChatRequest | 

    try:
        # Ai Chat
        api_response = api_instance.ai_chat_ai_chat_post(ai_chat_request)
        print("The response of DefaultApi->ai_chat_ai_chat_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->ai_chat_ai_chat_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **ai_chat_request** | [**AIChatRequest**](AIChatRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **analyze_news_api_news_analysis_post**
> object analyze_news_api_news_analysis_post(news_analysis_request)

Analyze News

### Example


```python
import integra_markets
from integra_markets.models.news_analysis_request import NewsAnalysisRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    news_analysis_request = integra_markets.NewsAnalysisRequest() # NewsAnalysisRequest | 

    try:
        # Analyze News
        api_response = api_instance.analyze_news_api_news_analysis_post(news_analysis_request)
        print("The response of DefaultApi->analyze_news_api_news_analysis_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->analyze_news_api_news_analysis_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **news_analysis_request** | [**NewsAnalysisRequest**](NewsAnalysisRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **analyze_sentiment_api_sentiment_post**
> object analyze_sentiment_api_sentiment_post(sentiment_request)

Analyze Sentiment

### Example


```python
import integra_markets
from integra_markets.models.sentiment_request import SentimentRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    sentiment_request = integra_markets.SentimentRequest() # SentimentRequest | 

    try:
        # Analyze Sentiment
        api_response = api_instance.analyze_sentiment_api_sentiment_post(sentiment_request)
        print("The response of DefaultApi->analyze_sentiment_api_sentiment_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->analyze_sentiment_api_sentiment_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **sentiment_request** | [**SentimentRequest**](SentimentRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **analyze_sentiment_legacy_analyze_sentiment_post**
> object analyze_sentiment_legacy_analyze_sentiment_post(sentiment_request)

Analyze Sentiment Legacy

### Example


```python
import integra_markets
from integra_markets.models.sentiment_request import SentimentRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    sentiment_request = integra_markets.SentimentRequest() # SentimentRequest | 

    try:
        # Analyze Sentiment Legacy
        api_response = api_instance.analyze_sentiment_legacy_analyze_sentiment_post(sentiment_request)
        print("The response of DefaultApi->analyze_sentiment_legacy_analyze_sentiment_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->analyze_sentiment_legacy_analyze_sentiment_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **sentiment_request** | [**SentimentRequest**](SentimentRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **comprehensive_analysis_api_comprehensive_analysis_post**
> object comprehensive_analysis_api_comprehensive_analysis_post(comprehensive_analysis_request)

Comprehensive Analysis

Perform comprehensive analysis with preprocessing and trigger keywords

### Example


```python
import integra_markets
from integra_markets.models.comprehensive_analysis_request import ComprehensiveAnalysisRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    comprehensive_analysis_request = integra_markets.ComprehensiveAnalysisRequest() # ComprehensiveAnalysisRequest | 

    try:
        # Comprehensive Analysis
        api_response = api_instance.comprehensive_analysis_api_comprehensive_analysis_post(comprehensive_analysis_request)
        print("The response of DefaultApi->comprehensive_analysis_api_comprehensive_analysis_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->comprehensive_analysis_api_comprehensive_analysis_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **comprehensive_analysis_request** | [**ComprehensiveAnalysisRequest**](ComprehensiveAnalysisRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **create_polymarket_connector_api_prediction_market_connectors_polymarket_post**
> object create_polymarket_connector_api_prediction_market_connectors_polymarket_post(polymarket_connector_request)

Create Polymarket Connector

### Example


```python
import integra_markets
from integra_markets.models.polymarket_connector_request import PolymarketConnectorRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    polymarket_connector_request = integra_markets.PolymarketConnectorRequest() # PolymarketConnectorRequest | 

    try:
        # Create Polymarket Connector
        api_response = api_instance.create_polymarket_connector_api_prediction_market_connectors_polymarket_post(polymarket_connector_request)
        print("The response of DefaultApi->create_polymarket_connector_api_prediction_market_connectors_polymarket_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->create_polymarket_connector_api_prediction_market_connectors_polymarket_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **polymarket_connector_request** | [**PolymarketConnectorRequest**](PolymarketConnectorRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **delete_polymarket_connector_api_prediction_market_connectors_polymarket_connector_id_delete**
> object delete_polymarket_connector_api_prediction_market_connectors_polymarket_connector_id_delete(connector_id, user_id=user_id)

Delete Polymarket Connector

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    connector_id = 'connector_id_example' # str | 
    user_id = 'user_id_example' # str |  (optional)

    try:
        # Delete Polymarket Connector
        api_response = api_instance.delete_polymarket_connector_api_prediction_market_connectors_polymarket_connector_id_delete(connector_id, user_id=user_id)
        print("The response of DefaultApi->delete_polymarket_connector_api_prediction_market_connectors_polymarket_connector_id_delete:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->delete_polymarket_connector_api_prediction_market_connectors_polymarket_connector_id_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **connector_id** | **str**|  | 
 **user_id** | **str**|  | [optional] 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **explain_commodity_lexicon_api_lexicon_explain_post**
> object explain_commodity_lexicon_api_lexicon_explain_post(lexicon_explain_request)

Explain Commodity Lexicon

### Example


```python
import integra_markets
from integra_markets.models.lexicon_explain_request import LexiconExplainRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    lexicon_explain_request = integra_markets.LexiconExplainRequest() # LexiconExplainRequest | 

    try:
        # Explain Commodity Lexicon
        api_response = api_instance.explain_commodity_lexicon_api_lexicon_explain_post(lexicon_explain_request)
        print("The response of DefaultApi->explain_commodity_lexicon_api_lexicon_explain_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->explain_commodity_lexicon_api_lexicon_explain_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **lexicon_explain_request** | [**LexiconExplainRequest**](LexiconExplainRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **generate_ai_report_ai_report_post**
> object generate_ai_report_ai_report_post(include_predictions=include_predictions, include_news=include_news, request_body=request_body)

Generate Ai Report

Generate comprehensive AI market report

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    include_predictions = True # bool |  (optional) (default to True)
    include_news = True # bool |  (optional) (default to True)
    request_body = ['request_body_example'] # List[Optional[str]] |  (optional)

    try:
        # Generate Ai Report
        api_response = api_instance.generate_ai_report_ai_report_post(include_predictions=include_predictions, include_news=include_news, request_body=request_body)
        print("The response of DefaultApi->generate_ai_report_ai_report_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->generate_ai_report_ai_report_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **include_predictions** | **bool**|  | [optional] [default to True]
 **include_news** | **bool**|  | [optional] [default to True]
 **request_body** | [**List[Optional[str]]**](str.md)|  | [optional] 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_commodity_lexicon_catalog_api_lexicon_commodities_get**
> object get_commodity_lexicon_catalog_api_lexicon_commodities_get()

Get Commodity Lexicon Catalog

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)

    try:
        # Get Commodity Lexicon Catalog
        api_response = api_instance.get_commodity_lexicon_catalog_api_lexicon_commodities_get()
        print("The response of DefaultApi->get_commodity_lexicon_catalog_api_lexicon_commodities_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_commodity_lexicon_catalog_api_lexicon_commodities_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_commodity_lexicon_detail_api_lexicon_commodities_commodity_get**
> object get_commodity_lexicon_detail_api_lexicon_commodities_commodity_get(commodity)

Get Commodity Lexicon Detail

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    commodity = 'commodity_example' # str | 

    try:
        # Get Commodity Lexicon Detail
        api_response = api_instance.get_commodity_lexicon_detail_api_lexicon_commodities_commodity_get(commodity)
        print("The response of DefaultApi->get_commodity_lexicon_detail_api_lexicon_commodities_commodity_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_commodity_lexicon_detail_api_lexicon_commodities_commodity_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **commodity** | **str**|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_dashboard_sentiment_engine_api_dashboard_sentiment_engine_post**
> object get_dashboard_sentiment_engine_api_dashboard_sentiment_engine_post(dashboard_sentiment_engine_request)

Get Dashboard Sentiment Engine

### Example


```python
import integra_markets
from integra_markets.models.dashboard_sentiment_engine_request import DashboardSentimentEngineRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    dashboard_sentiment_engine_request = integra_markets.DashboardSentimentEngineRequest() # DashboardSentimentEngineRequest | 

    try:
        # Get Dashboard Sentiment Engine
        api_response = api_instance.get_dashboard_sentiment_engine_api_dashboard_sentiment_engine_post(dashboard_sentiment_engine_request)
        print("The response of DefaultApi->get_dashboard_sentiment_engine_api_dashboard_sentiment_engine_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_dashboard_sentiment_engine_api_dashboard_sentiment_engine_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **dashboard_sentiment_engine_request** | [**DashboardSentimentEngineRequest**](DashboardSentimentEngineRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_market_sentiment_api_sentiment_market_get**
> object get_market_sentiment_api_sentiment_market_get()

Get Market Sentiment

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)

    try:
        # Get Market Sentiment
        api_response = api_instance.get_market_sentiment_api_sentiment_market_get()
        print("The response of DefaultApi->get_market_sentiment_api_sentiment_market_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_market_sentiment_api_sentiment_market_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_models_status_api_models_status_get**
> object get_models_status_api_models_status_get()

Get Models Status

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)

    try:
        # Get Models Status
        api_response = api_instance.get_models_status_api_models_status_get()
        print("The response of DefaultApi->get_models_status_api_models_status_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_models_status_api_models_status_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_news_feed_api_news_feed_post**
> object get_news_feed_api_news_feed_post(news_request)

Get News Feed

Fetch real news articles from multiple financial sources

### Example


```python
import integra_markets
from integra_markets.models.news_request import NewsRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    news_request = integra_markets.NewsRequest() # NewsRequest | 

    try:
        # Get News Feed
        api_response = api_instance.get_news_feed_api_news_feed_post(news_request)
        print("The response of DefaultApi->get_news_feed_api_news_feed_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_news_feed_api_news_feed_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **news_request** | [**NewsRequest**](NewsRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_overall_news_sentiment_api_news_overall_sentiment_post**
> object get_overall_news_sentiment_api_news_overall_sentiment_post(overall_sentiment_request)

Get Overall News Sentiment

Aggregate the latest cached headlines into a market-level sentiment summary.

### Example


```python
import integra_markets
from integra_markets.models.overall_sentiment_request import OverallSentimentRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    overall_sentiment_request = integra_markets.OverallSentimentRequest() # OverallSentimentRequest | 

    try:
        # Get Overall News Sentiment
        api_response = api_instance.get_overall_news_sentiment_api_news_overall_sentiment_post(overall_sentiment_request)
        print("The response of DefaultApi->get_overall_news_sentiment_api_news_overall_sentiment_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_overall_news_sentiment_api_news_overall_sentiment_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **overall_sentiment_request** | [**OverallSentimentRequest**](OverallSentimentRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_polymarket_connector_sentiment_api_prediction_market_polymarket_sentiment_post**
> object get_polymarket_connector_sentiment_api_prediction_market_polymarket_sentiment_post(polymarket_sentiment_request)

Get Polymarket Connector Sentiment

### Example


```python
import integra_markets
from integra_markets.models.polymarket_sentiment_request import PolymarketSentimentRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    polymarket_sentiment_request = integra_markets.PolymarketSentimentRequest() # PolymarketSentimentRequest | 

    try:
        # Get Polymarket Connector Sentiment
        api_response = api_instance.get_polymarket_connector_sentiment_api_prediction_market_polymarket_sentiment_post(polymarket_sentiment_request)
        print("The response of DefaultApi->get_polymarket_connector_sentiment_api_prediction_market_polymarket_sentiment_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_polymarket_connector_sentiment_api_prediction_market_polymarket_sentiment_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **polymarket_sentiment_request** | [**PolymarketSentimentRequest**](PolymarketSentimentRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_top_movers_api_sentiment_movers_get**
> object get_top_movers_api_sentiment_movers_get()

Get Top Movers

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)

    try:
        # Get Top Movers
        api_response = api_instance.get_top_movers_api_sentiment_movers_get()
        print("The response of DefaultApi->get_top_movers_api_sentiment_movers_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_top_movers_api_sentiment_movers_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_user_news_api_user_news_post**
> object get_user_news_api_user_news_post(user_news_request)

Get User News

Fetch personalized news based on user's saved preferences in Supabase

### Example


```python
import integra_markets
from integra_markets.models.user_news_request import UserNewsRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    user_news_request = integra_markets.UserNewsRequest() # UserNewsRequest | 

    try:
        # Get User News
        api_response = api_instance.get_user_news_api_user_news_post(user_news_request)
        print("The response of DefaultApi->get_user_news_api_user_news_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_user_news_api_user_news_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **user_news_request** | [**UserNewsRequest**](UserNewsRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_weather_alerts_api_weather_alerts_get**
> object get_weather_alerts_api_weather_alerts_get()

Get Weather Alerts

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)

    try:
        # Get Weather Alerts
        api_response = api_instance.get_weather_alerts_api_weather_alerts_get()
        print("The response of DefaultApi->get_weather_alerts_api_weather_alerts_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->get_weather_alerts_api_weather_alerts_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **health_check_health_get**
> object health_check_health_get()

Health Check

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)

    try:
        # Health Check
        api_response = api_instance.health_check_health_get()
        print("The response of DefaultApi->health_check_health_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->health_check_health_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_polymarket_connectors_api_prediction_market_connectors_polymarket_user_id_get**
> object list_polymarket_connectors_api_prediction_market_connectors_polymarket_user_id_get(user_id)

List Polymarket Connectors

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    user_id = 'user_id_example' # str | 

    try:
        # List Polymarket Connectors
        api_response = api_instance.list_polymarket_connectors_api_prediction_market_connectors_polymarket_user_id_get(user_id)
        print("The response of DefaultApi->list_polymarket_connectors_api_prediction_market_connectors_polymarket_user_id_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->list_polymarket_connectors_api_prediction_market_connectors_polymarket_user_id_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **user_id** | **str**|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **read_root_get**
> object read_root_get()

Read Root

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)

    try:
        # Read Root
        api_response = api_instance.read_root_get()
        print("The response of DefaultApi->read_root_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->read_root_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **summarize_article_api_summarize_article_post**
> object summarize_article_api_summarize_article_post(article_summarize_request)

Summarize Article

Summarize a financial news article from URL

### Example


```python
import integra_markets
from integra_markets.models.article_summarize_request import ArticleSummarizeRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    article_summarize_request = integra_markets.ArticleSummarizeRequest() # ArticleSummarizeRequest | 

    try:
        # Summarize Article
        api_response = api_instance.summarize_article_api_summarize_article_post(article_summarize_request)
        print("The response of DefaultApi->summarize_article_api_summarize_article_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->summarize_article_api_summarize_article_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **article_summarize_request** | [**ArticleSummarizeRequest**](ArticleSummarizeRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **test_news_endpoint_api_test_news_get**
> object test_news_endpoint_api_test_news_get()

Test News Endpoint

Test endpoint for news functionality

### Example


```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)

    try:
        # Test News Endpoint
        api_response = api_instance.test_news_endpoint_api_test_news_get()
        print("The response of DefaultApi->test_news_endpoint_api_test_news_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->test_news_endpoint_api_test_news_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validate_polymarket_connector_api_prediction_market_connectors_polymarket_validate_post**
> object validate_polymarket_connector_api_prediction_market_connectors_polymarket_validate_post(polymarket_connector_validation_request)

Validate Polymarket Connector

### Example


```python
import integra_markets
from integra_markets.models.polymarket_connector_validation_request import PolymarketConnectorValidationRequest
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)


# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.DefaultApi(api_client)
    polymarket_connector_validation_request = integra_markets.PolymarketConnectorValidationRequest() # PolymarketConnectorValidationRequest | 

    try:
        # Validate Polymarket Connector
        api_response = api_instance.validate_polymarket_connector_api_prediction_market_connectors_polymarket_validate_post(polymarket_connector_validation_request)
        print("The response of DefaultApi->validate_polymarket_connector_api_prediction_market_connectors_polymarket_validate_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->validate_polymarket_connector_api_prediction_market_connectors_polymarket_validate_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **polymarket_connector_validation_request** | [**PolymarketConnectorValidationRequest**](PolymarketConnectorValidationRequest.md)|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

