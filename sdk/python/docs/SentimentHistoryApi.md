# integra_markets.SentimentHistoryApi

All URIs are relative to *https://api.integramarkets.app*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_market_overlay**](SentimentHistoryApi.md#get_market_overlay) | **GET** /v1/markets/overlay | Markets Overlay
[**get_sentiment_daily**](SentimentHistoryApi.md#get_sentiment_daily) | **GET** /v1/sentiment/{commodity}/daily | Sentiment Daily
[**get_sentiment_history**](SentimentHistoryApi.md#get_sentiment_history) | **GET** /v1/sentiment/{commodity}/history | Sentiment History
[**get_sentiment_now**](SentimentHistoryApi.md#get_sentiment_now) | **GET** /v1/sentiment/{commodity}/now | Sentiment Now
[**list_commodities**](SentimentHistoryApi.md#list_commodities) | **GET** /v1/commodities | List Commodities


# **get_market_overlay**
> object get_market_overlay(provider=provider, status=status, limit=limit, authorization=authorization)

Markets Overlay

Resolved prediction markets with linked news-sentiment context.

For the beta this returns the resolved markets enriched with the
average news sentiment over the market's lifetime. Full per-snapshot
overlay arrives once the nightly aggregation job is wired up; this
endpoint already returns the shape that job will populate.

### Example

* Bearer Authentication (ApiKeyAuth):

```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: ApiKeyAuth
configuration = integra_markets.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.SentimentHistoryApi(api_client)
    provider = 'kalshi' # str |  (optional) (default to 'kalshi')
    status = 'settled' # str | market status filter applied to raw_payload (optional) (default to 'settled')
    limit = 50 # int |  (optional) (default to 50)
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Markets Overlay
        api_response = api_instance.get_market_overlay(provider=provider, status=status, limit=limit, authorization=authorization)
        print("The response of SentimentHistoryApi->get_market_overlay:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SentimentHistoryApi->get_market_overlay: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **provider** | **str**|  | [optional] [default to &#39;kalshi&#39;]
 **status** | **str**| market status filter applied to raw_payload | [optional] [default to &#39;settled&#39;]
 **limit** | **int**|  | [optional] [default to 50]
 **authorization** | **str**|  | [optional] 

### Return type

**object**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_sentiment_daily**
> object get_sentiment_daily(commodity, days=days, authorization=authorization)

Sentiment Daily

Daily aggregates for the last N days, computed on-the-fly.

### Example

* Bearer Authentication (ApiKeyAuth):

```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: ApiKeyAuth
configuration = integra_markets.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.SentimentHistoryApi(api_client)
    commodity = 'commodity_example' # str | 
    days = 30 # int |  (optional) (default to 30)
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Sentiment Daily
        api_response = api_instance.get_sentiment_daily(commodity, days=days, authorization=authorization)
        print("The response of SentimentHistoryApi->get_sentiment_daily:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SentimentHistoryApi->get_sentiment_daily: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **commodity** | **str**|  | 
 **days** | **int**|  | [optional] [default to 30]
 **authorization** | **str**|  | [optional] 

### Return type

**object**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_sentiment_history**
> object get_sentiment_history(commodity, var_from=var_from, to=to, limit=limit, authorization=authorization)

Sentiment History

Time-series of individual scored documents for `commodity`.

### Example

* Bearer Authentication (ApiKeyAuth):

```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: ApiKeyAuth
configuration = integra_markets.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.SentimentHistoryApi(api_client)
    commodity = 'commodity_example' # str | 
    var_from = 'var_from_example' # str | ISO 8601 UTC timestamp (optional)
    to = 'to_example' # str | ISO 8601 UTC timestamp (optional)
    limit = 100 # int |  (optional) (default to 100)
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Sentiment History
        api_response = api_instance.get_sentiment_history(commodity, var_from=var_from, to=to, limit=limit, authorization=authorization)
        print("The response of SentimentHistoryApi->get_sentiment_history:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SentimentHistoryApi->get_sentiment_history: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **commodity** | **str**|  | 
 **var_from** | **str**| ISO 8601 UTC timestamp | [optional] 
 **to** | **str**| ISO 8601 UTC timestamp | [optional] 
 **limit** | **int**|  | [optional] [default to 100]
 **authorization** | **str**|  | [optional] 

### Return type

**object**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_sentiment_now**
> object get_sentiment_now(commodity, authorization=authorization)

Sentiment Now

Most recent observed sentiment for `commodity` plus a 24h rolling stat.

### Example

* Bearer Authentication (ApiKeyAuth):

```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: ApiKeyAuth
configuration = integra_markets.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.SentimentHistoryApi(api_client)
    commodity = 'commodity_example' # str | 
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Sentiment Now
        api_response = api_instance.get_sentiment_now(commodity, authorization=authorization)
        print("The response of SentimentHistoryApi->get_sentiment_now:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SentimentHistoryApi->get_sentiment_now: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **commodity** | **str**|  | 
 **authorization** | **str**|  | [optional] 

### Return type

**object**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_commodities**
> object list_commodities(authorization=authorization)

List Commodities

Return distinct commodities that have at least one scored document.

### Example

* Bearer Authentication (ApiKeyAuth):

```python
import integra_markets
from integra_markets.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.integramarkets.app
# See configuration.py for a list of all supported configuration parameters.
configuration = integra_markets.Configuration(
    host = "https://api.integramarkets.app"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: ApiKeyAuth
configuration = integra_markets.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with integra_markets.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = integra_markets.SentimentHistoryApi(api_client)
    authorization = 'authorization_example' # str |  (optional)

    try:
        # List Commodities
        api_response = api_instance.list_commodities(authorization=authorization)
        print("The response of SentimentHistoryApi->list_commodities:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SentimentHistoryApi->list_commodities: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **authorization** | **str**|  | [optional] 

### Return type

**object**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

