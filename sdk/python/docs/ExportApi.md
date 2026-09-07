# integra_markets.ExportApi

All URIs are relative to *https://api.integramarkets.app*

Method | HTTP request | Description
------------- | ------------- | -------------
[**export_sentiment**](ExportApi.md#export_sentiment) | **GET** /v1/export/sentiment | Export Sentiment


# **export_sentiment**
> object export_sentiment(commodity, var_from=var_from, to=to, format=format, authorization=authorization)

Export Sentiment

Bulk-export scored sentiment rows as CSV or XLSX.

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
    api_instance = integra_markets.ExportApi(api_client)
    commodity = 'commodity_example' # str | Commodity or topic key, e.g. crude_oil
    var_from = 'var_from_example' # str | ISO 8601 UTC (optional)
    to = 'to_example' # str | ISO 8601 UTC (optional)
    format = 'csv' # str |  (optional) (default to 'csv')
    authorization = 'authorization_example' # str |  (optional)

    try:
        # Export Sentiment
        api_response = api_instance.export_sentiment(commodity, var_from=var_from, to=to, format=format, authorization=authorization)
        print("The response of ExportApi->export_sentiment:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ExportApi->export_sentiment: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **commodity** | **str**| Commodity or topic key, e.g. crude_oil | 
 **var_from** | **str**| ISO 8601 UTC | [optional] 
 **to** | **str**| ISO 8601 UTC | [optional] 
 **format** | **str**|  | [optional] [default to &#39;csv&#39;]
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

