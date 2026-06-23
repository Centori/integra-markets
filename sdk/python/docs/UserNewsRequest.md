# UserNewsRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**user_id** | **str** | User ID in Supabase | 
**max_articles** | **int** |  | [optional] 
**enhanced_content** | **bool** |  | [optional] 
**max_enhanced** | **int** |  | [optional] 

## Example

```python
from integra_markets.models.user_news_request import UserNewsRequest

# TODO update the JSON string below
json = "{}"
# create an instance of UserNewsRequest from a JSON string
user_news_request_instance = UserNewsRequest.from_json(json)
# print the JSON string representation of the object
print(UserNewsRequest.to_json())

# convert the object into a dict
user_news_request_dict = user_news_request_instance.to_dict()
# create an instance of UserNewsRequest from a dict
user_news_request_from_dict = UserNewsRequest.from_dict(user_news_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


