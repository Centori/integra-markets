# CreateKeyResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**key** | **str** |  | 
**prefix** | **str** |  | 
**name** | **str** |  | 
**created_at** | **str** |  | 

## Example

```python
from integra_markets.models.create_key_response import CreateKeyResponse

# TODO update the JSON string below
json = "{}"
# create an instance of CreateKeyResponse from a JSON string
create_key_response_instance = CreateKeyResponse.from_json(json)
# print the JSON string representation of the object
print(CreateKeyResponse.to_json())

# convert the object into a dict
create_key_response_dict = create_key_response_instance.to_dict()
# create an instance of CreateKeyResponse from a dict
create_key_response_from_dict = CreateKeyResponse.from_dict(create_key_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


