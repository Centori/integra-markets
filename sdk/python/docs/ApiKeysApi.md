# integra_markets.ApiKeysApi

All URIs are relative to *https://api.integramarkets.app*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_key_api_keys_post**](ApiKeysApi.md#create_key_api_keys_post) | **POST** /api/keys | Create Key
[**list_keys_api_keys_get**](ApiKeysApi.md#list_keys_api_keys_get) | **GET** /api/keys | List Keys
[**revoke_key_api_keys_key_id_delete**](ApiKeysApi.md#revoke_key_api_keys_key_id_delete) | **DELETE** /api/keys/{key_id} | Revoke Key


# **create_key_api_keys_post**
> CreateKeyResponse create_key_api_keys_post(create_key_request)

Create Key

### Example


```python
import integra_markets
from integra_markets.models.create_key_request import CreateKeyRequest
from integra_markets.models.create_key_response import CreateKeyResponse
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
    api_instance = integra_markets.ApiKeysApi(api_client)
    create_key_request = integra_markets.CreateKeyRequest() # CreateKeyRequest | 

    try:
        # Create Key
        api_response = api_instance.create_key_api_keys_post(create_key_request)
        print("The response of ApiKeysApi->create_key_api_keys_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ApiKeysApi->create_key_api_keys_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **create_key_request** | [**CreateKeyRequest**](CreateKeyRequest.md)|  | 

### Return type

[**CreateKeyResponse**](CreateKeyResponse.md)

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

# **list_keys_api_keys_get**
> List[KeyRow] list_keys_api_keys_get(user_id)

List Keys

### Example


```python
import integra_markets
from integra_markets.models.key_row import KeyRow
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
    api_instance = integra_markets.ApiKeysApi(api_client)
    user_id = 'user_id_example' # str | 

    try:
        # List Keys
        api_response = api_instance.list_keys_api_keys_get(user_id)
        print("The response of ApiKeysApi->list_keys_api_keys_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ApiKeysApi->list_keys_api_keys_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **user_id** | **str**|  | 

### Return type

[**List[KeyRow]**](KeyRow.md)

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

# **revoke_key_api_keys_key_id_delete**
> Dict[str, object] revoke_key_api_keys_key_id_delete(key_id, user_id)

Revoke Key

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
    api_instance = integra_markets.ApiKeysApi(api_client)
    key_id = 'key_id_example' # str | 
    user_id = 'user_id_example' # str | 

    try:
        # Revoke Key
        api_response = api_instance.revoke_key_api_keys_key_id_delete(key_id, user_id)
        print("The response of ApiKeysApi->revoke_key_api_keys_key_id_delete:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ApiKeysApi->revoke_key_api_keys_key_id_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **key_id** | **str**|  | 
 **user_id** | **str**|  | 

### Return type

**Dict[str, object]**

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

