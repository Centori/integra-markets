# integra_markets.DivergenceApi

All URIs are relative to *https://api.integramarkets.app*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_divergence**](DivergenceApi.md#get_divergence) | **GET** /v1/markets/divergence | Divergence Batch
[**get_divergence_for_topic**](DivergenceApi.md#get_divergence_for_topic) | **GET** /v1/markets/divergence/{topic} | Divergence For Topic
[**list_topics**](DivergenceApi.md#list_topics) | **GET** /v1/topics | List Topics


# **get_divergence**
> object get_divergence(topics, threshold=threshold, lookback_hours=lookback_hours, authorization=authorization)

Divergence Batch

Batch divergence — useful for the dashboard / scanner views.

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
    api_instance = integra_markets.DivergenceApi(api_client)
    topics = 'topics_example' # str | Comma-separated topic keys (max 10)
    threshold = 0.2 # float |  (optional) (default to 0.2)
    lookback_hours = 24 # int |  (optional) (default to 24)
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Divergence Batch
        api_response = api_instance.get_divergence(topics, threshold=threshold, lookback_hours=lookback_hours, authorization=authorization)
        print("The response of DivergenceApi->get_divergence:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DivergenceApi->get_divergence: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **topics** | **str**| Comma-separated topic keys (max 10) | 
 **threshold** | **float**|  | [optional] [default to 0.2]
 **lookback_hours** | **int**|  | [optional] [default to 24]
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

# **get_divergence_for_topic**
> object get_divergence_for_topic(topic, threshold=threshold, lookback_hours=lookback_hours, authorization=authorization)

Divergence For Topic

News sentiment vs. prediction-market consensus for one topic.

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
    api_instance = integra_markets.DivergenceApi(api_client)
    topic = 'topic_example' # str | 
    threshold = 0.2 # float |  (optional) (default to 0.2)
    lookback_hours = 24 # int |  (optional) (default to 24)
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Divergence For Topic
        api_response = api_instance.get_divergence_for_topic(topic, threshold=threshold, lookback_hours=lookback_hours, authorization=authorization)
        print("The response of DivergenceApi->get_divergence_for_topic:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DivergenceApi->get_divergence_for_topic: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **topic** | **str**|  | 
 **threshold** | **float**|  | [optional] [default to 0.2]
 **lookback_hours** | **int**|  | [optional] [default to 24]
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

# **list_topics**
> object list_topics(authorization=authorization)

List Topics

All topics + categories Integra tracks for divergence.

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
    api_instance = integra_markets.DivergenceApi(api_client)
    authorization = 'authorization_example' # str |  (optional)

    try:
        # List Topics
        api_response = api_instance.list_topics(authorization=authorization)
        print("The response of DivergenceApi->list_topics:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DivergenceApi->list_topics: %s\n" % e)
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

