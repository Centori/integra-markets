# integra_markets.AgentApi

All URIs are relative to *https://api.integramarkets.app*

Method | HTTP request | Description
------------- | ------------- | -------------
[**ask_agent**](AgentApi.md#ask_agent) | **POST** /v1/agent/ask | Ask
[**list_agent_templates**](AgentApi.md#list_agent_templates) | **GET** /v1/agent/templates | List Templates


# **ask_agent**
> AskResponse ask_agent(ask_request, authorization=authorization)

Ask

### Example

* Bearer Authentication (ApiKeyAuth):

```python
import integra_markets
from integra_markets.models.ask_request import AskRequest
from integra_markets.models.ask_response import AskResponse
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
    api_instance = integra_markets.AgentApi(api_client)
    ask_request = integra_markets.AskRequest() # AskRequest | 
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Ask
        api_response = api_instance.ask_agent(ask_request, authorization=authorization)
        print("The response of AgentApi->ask_agent:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AgentApi->ask_agent: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **ask_request** | [**AskRequest**](AskRequest.md)|  | 
 **authorization** | **str**|  | [optional] 

### Return type

[**AskResponse**](AskResponse.md)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_agent_templates**
> object list_agent_templates(authorization=authorization)

List Templates

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
    api_instance = integra_markets.AgentApi(api_client)
    authorization = 'authorization_example' # str |  (optional)

    try:
        # List Templates
        api_response = api_instance.list_agent_templates(authorization=authorization)
        print("The response of AgentApi->list_agent_templates:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AgentApi->list_agent_templates: %s\n" % e)
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

