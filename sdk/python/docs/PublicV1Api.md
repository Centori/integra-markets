# integra_markets.PublicV1Api

All URIs are relative to *https://api.integramarkets.app*

Method | HTTP request | Description
------------- | ------------- | -------------
[**find_historical_analogs**](PublicV1Api.md#find_historical_analogs) | **GET** /v1/historical/analogs | Historical Analogs
[**get_brief**](PublicV1Api.md#get_brief) | **GET** /v1/brief | Brief
[**get_narratives**](PublicV1Api.md#get_narratives) | **GET** /v1/narratives | Narratives
[**get_sentiment**](PublicV1Api.md#get_sentiment) | **GET** /v1/sentiment | Sentiment


# **find_historical_analogs**
> object find_historical_analogs(commodity, event, n=n, authorization=authorization)

Historical Analogs

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
    api_instance = integra_markets.PublicV1Api(api_client)
    commodity = 'commodity_example' # str | 
    event = 'event_example' # str | Free-text description of the current setup
    n = 5 # int |  (optional) (default to 5)
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Historical Analogs
        api_response = api_instance.find_historical_analogs(commodity, event, n=n, authorization=authorization)
        print("The response of PublicV1Api->find_historical_analogs:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PublicV1Api->find_historical_analogs: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **commodity** | **str**|  | 
 **event** | **str**| Free-text description of the current setup | 
 **n** | **int**|  | [optional] [default to 5]
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

# **get_brief**
> object get_brief(commodity, authorization=authorization)

Brief

Composite briefing: 7d + 30d sentiment, top narratives, key divergences.

Composed from the same underlying data as the individual endpoints — one
request instead of four so the MCP client can pull a full snapshot for
Claude with minimum roundtrips.

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
    api_instance = integra_markets.PublicV1Api(api_client)
    commodity = 'commodity_example' # str | Commodity ticker
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Brief
        api_response = api_instance.get_brief(commodity, authorization=authorization)
        print("The response of PublicV1Api->get_brief:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PublicV1Api->get_brief: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **commodity** | **str**| Commodity ticker | 
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

# **get_narratives**
> object get_narratives(commodity, lookback=lookback, authorization=authorization)

Narratives

Emerging themes derived from clustering recent article headlines.

Beta shape: groups articles by shared keyword stems in the headline and
returns the top clusters with average sentiment. A dedicated topic-model
service will replace this stem-clustering approach once we have training
data volume to justify it.

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
    api_instance = integra_markets.PublicV1Api(api_client)
    commodity = 'commodity_example' # str | Commodity ticker
    lookback = '7d' # str | One of 24h, 7d, 30d (optional) (default to '7d')
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Narratives
        api_response = api_instance.get_narratives(commodity, lookback=lookback, authorization=authorization)
        print("The response of PublicV1Api->get_narratives:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PublicV1Api->get_narratives: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **commodity** | **str**| Commodity ticker | 
 **lookback** | **str**| One of 24h, 7d, 30d | [optional] [default to &#39;7d&#39;]
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

# **get_sentiment**
> object get_sentiment(commodity, window=window, authorization=authorization)

Sentiment

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
    api_instance = integra_markets.PublicV1Api(api_client)
    commodity = 'commodity_example' # str | Commodity ticker, e.g. 'brent'
    window = '7d' # str | One of 24h, 7d, 30d, 90d (optional) (default to '7d')
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Sentiment
        api_response = api_instance.get_sentiment(commodity, window=window, authorization=authorization)
        print("The response of PublicV1Api->get_sentiment:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PublicV1Api->get_sentiment: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **commodity** | **str**| Commodity ticker, e.g. &#39;brent&#39; | 
 **window** | **str**| One of 24h, 7d, 30d, 90d | [optional] [default to &#39;7d&#39;]
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

