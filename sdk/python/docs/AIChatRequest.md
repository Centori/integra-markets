# AIChatRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**messages** | **List[Dict[str, str]]** | Chat messages | 
**available_tools** | **List[str]** | Available tools to use | [optional] 
**commodity** | **str** | Commodity context | [optional] 
**mode** | **str** | Response mode | [optional] 

## Example

```python
from integra_markets.models.ai_chat_request import AIChatRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AIChatRequest from a JSON string
ai_chat_request_instance = AIChatRequest.from_json(json)
# print the JSON string representation of the object
print(AIChatRequest.to_json())

# convert the object into a dict
ai_chat_request_dict = ai_chat_request_instance.to_dict()
# create an instance of AIChatRequest from a dict
ai_chat_request_from_dict = AIChatRequest.from_dict(ai_chat_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


